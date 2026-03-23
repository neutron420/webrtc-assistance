import os
import shutil
import json
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from models.schema import TranscriptionResponse
from services.whisper_service import WhisperService
from services.analytics_service import analytics_service

logger = logging.getLogger(__name__)

router = APIRouter()
whisper_service = WhisperService()

# Temporary directory to store uploaded audio files
UPLOAD_DIR = "temp_audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload-audio", response_model=TranscriptionResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Receives an audio file, transcribes it using Whisper,
    and returns the transcript with filler word analysis and WPM.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_location = os.path.join(UPLOAD_DIR, file.filename)

    try:
        # Save the uploaded file temporarily
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        logger.info(f"File saved temporarily at {file_location}")

        # 1. Transcribe using Whisper
        transcription_text = await whisper_service.transcribe_audio(file_location)

        # 2. Detect filler words in the transcript
        filler_counts = analytics_service.detect_filler_words(transcription_text)
        filler_total = analytics_service.get_filler_word_total(filler_counts)

        # 3. Calculate WPM (using estimated duration if not available)
        wpm = analytics_service.calculate_wpm(transcription_text, duration_seconds=None)

        return TranscriptionResponse(
            text=transcription_text,
            filename=file.filename,
            wpm=wpm,
            filler_words=filler_counts,
            filler_word_count=filler_total,
        )

    except Exception as e:
        logger.error(f"Error processing audio upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error during audio processing"
        )
    finally:
        # Always clean up the temporary file
        if os.path.exists(file_location):
            os.remove(file_location)
            logger.info(f"Cleaned up temporary file: {file_location}")


@router.websocket("/ws/audio-stream")
async def audio_stream_websocket(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for live audio streaming and feedback.
    
    Protocol:
    - Client sends JSON messages with audio metrics
    - Server responds with real-time feedback cues
    
    Message format from client:
    {
        "type": "metrics_update",
        "wpm": 165.2,
        "filler_count": 3,
        "eye_contact_score": 72.5,
        "transcript_chunk": "so basically um I think..."
    }
    
    Response from server:
    {
        "type": "feedback",
        "cues": ["🐇 Slow down a little — you're speaking quickly."],
        "filler_words_detected": {"um": 1, "basically": 1}
    }
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted for real-time feedback")

    try:
        while True:
            # Receive metrics from frontend
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)

            msg_type = data.get("type", "unknown")

            if msg_type == "metrics_update":
                wpm = data.get("wpm", 0)
                filler_count = data.get("filler_count", 0)
                eye_contact = data.get("eye_contact_score", 100)
                transcript_chunk = data.get("transcript_chunk", "")

                # Detect filler words in the latest chunk
                chunk_fillers = {}
                if transcript_chunk:
                    chunk_fillers = analytics_service.detect_filler_words(transcript_chunk)
                    filler_count += analytics_service.get_filler_word_total(chunk_fillers)

                # Generate real-time feedback cues
                cues = analytics_service.generate_real_time_feedback(
                    wpm=wpm,
                    filler_count=filler_count,
                    eye_contact_score=eye_contact,
                )

                # Send feedback back to client
                await websocket.send_json({
                    "type": "feedback",
                    "cues": cues,
                    "filler_words_detected": chunk_fillers,
                    "current_wpm": wpm,
                })

            elif msg_type == "audio_chunk":
                # Future: handle raw audio bytes for streaming transcription
                logger.debug("Received audio chunk for streaming transcription")
                await websocket.send_json({
                    "type": "ack",
                    "message": "Audio chunk received",
                })

            elif msg_type == "end_session":
                logger.info("Client ended the session via WebSocket")
                await websocket.send_json({
                    "type": "session_ended",
                    "message": "Session ended. Generating final scorecard...",
                })
                break

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except json.JSONDecodeError:
        logger.error("Received invalid JSON on WebSocket")
        await websocket.send_json({
            "type": "error",
            "message": "Invalid JSON format"
        })
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
