import os
import shutil
import json
import logging
import time
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from models.schema import TranscriptionResponse
from services.whisper_service import WhisperService
from services.analytics_service import analytics_service
from services.redis_service import redis_service

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
    # SANITIZE FILENAME (Security Patch: Prevent Path Traversal)
    safe_filename = os.path.basename(file.filename) if file.filename else f"audio_{int(time.time())}.webm"
    file_location = os.path.join(UPLOAD_DIR, safe_filename)

    try:
        # Save the uploaded file temporarily
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        logger.info(f"File saved temporarily at {file_location}")

        # 1. Transcribe using Whisper (returns {text, duration})
        whisper_result = await whisper_service.transcribe_audio(file_location)
        transcription_text = whisper_result.get("text", "")
        audio_duration = whisper_result.get("duration", None)

        # 2. Detect filler words in the transcript
        filler_counts = analytics_service.detect_filler_words(transcription_text)
        filler_total = analytics_service.get_filler_word_total(filler_counts)

        # 3. Calculate WPM using REAL audio duration from Whisper
        wpm = analytics_service.calculate_wpm(transcription_text, duration_seconds=audio_duration)

        return TranscriptionResponse(
            text=transcription_text,
            filename=file.filename,
            duration=audio_duration,
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
    Real-time WebSocket endpoint for live audio streaming and transcription.
    
    Features:
    - Buffers audio chunks to reduce API calls
    - Implements adaptive throttling to avoid rate limits
    - Batches transcription requests efficiently
    
    Message format from client:
    {
        "type": "audio_chunk",
        "session_id": 1,
        "audio_data": [int16_array],
        "timestamp": 1234567890
    }
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted for real-time transcription")

    audio_buffer = []
    accumulated_transcript = ""
    last_transcript_chunk = ""
    last_transcription_time = 0
    min_transcription_interval = 3  # Only transcribe every 3 seconds minimum
    running_filler_total = 0
    stream_sample_rate = 16000

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)

            msg_type = data.get("type", "unknown")

            if msg_type == "audio_chunk":
                # Collect audio chunks
                audio_data = data.get("audio_data", [])
                incoming_sample_rate = data.get("sample_rate")
                if isinstance(incoming_sample_rate, (int, float)) and incoming_sample_rate > 0:
                    stream_sample_rate = int(incoming_sample_rate)

                if audio_data:
                    audio_buffer.extend(audio_data)
                
                # Transcribe only after accumulating ~3 seconds of audio at the current stream sample rate.
                # and respecting minimum interval to avoid rate limiting
                current_time = time.time()
                target_samples = max(8000, int(stream_sample_rate * 3))
                should_transcribe = (
                    len(audio_buffer) >= target_samples and 
                    (current_time - last_transcription_time) >= min_transcription_interval
                )
                
                if should_transcribe:
                    # Convert int16 array to bytes
                    try:
                        chunk = audio_buffer[:target_samples]
                        pcm_samples = [max(-32768, min(32767, int(sample))) for sample in chunk]
                        audio_bytes = b"".join(sample.to_bytes(2, byteorder="little", signed=True) for sample in pcm_samples)
                        
                        # Transcribe with retry logic built into the service
                        transcript_chunk = await whisper_service.transcribe_audio_bytes(audio_bytes, sample_rate=stream_sample_rate)
                        transcript_text = transcript_chunk.get("text", "").strip()
                        
                        if transcript_text and transcript_text != last_transcript_chunk:
                            accumulated_transcript += " " + transcript_text
                            last_transcript_chunk = transcript_text
                            last_transcription_time = current_time
                            
                            # Send transcript chunk to client
                            await websocket.send_json({
                                "type": "transcript_chunk",
                                "text": transcript_text,
                                "is_final": False,
                                "accumulated": accumulated_transcript.strip()
                            })
                            
                            logger.info(f"Streamed transcript: {transcript_text}")
                        
                        # Remove processed samples
                        audio_buffer = audio_buffer[target_samples:]
                        
                    except Exception as e:
                        logger.error(f"Error transcribing chunk: {str(e)}")
                        # Don't crash, just skip this chunk
                        audio_buffer = audio_buffer[target_samples:] if len(audio_buffer) > target_samples else []

            elif msg_type == "metrics_update":
                wpm = data.get("wpm", 0)
                filler_count = int(data.get("filler_count", 0) or 0)
                eye_contact = data.get("eye_contact_score", 100)
                mood = data.get("mood", "Neutral")
                transcript_chunk = data.get("transcript_chunk", "")

                # Detect filler words in the latest chunk
                chunk_fillers = {}
                if transcript_chunk:
                    chunk_fillers = analytics_service.detect_filler_words(transcript_chunk)
                    running_filler_total += analytics_service.get_filler_word_total(chunk_fillers)

                # Keep cumulative filler total monotonic and robust to client refreshes.
                filler_count = max(filler_count, running_filler_total)

                # Generate confidence score
                confidence_score = analytics_service.calculate_confidence_score(
                    wpm=wpm,
                    filler_count=filler_count,
                    eye_contact_score=eye_contact,
                )

                # Generate real-time feedback cues
                cues = analytics_service.generate_real_time_feedback(
                    wpm=wpm,
                    filler_count=filler_count,
                    eye_contact_score=eye_contact,
                    mood=mood
                )

                feedback_payload = {
                    "type": "feedback",
                    "cues": cues,
                    "filler_words_detected": chunk_fillers,
                    "current_wpm": wpm,
                    "confidence_score": confidence_score,
                    "total_fillers": filler_count
                }

                # Send directly back to connected user
                await websocket.send_json(feedback_payload)
                
                # Publish to Redis for cross-server observability
                session_id = data.get("session_id", "unknown_session")
                await redis_service.publish(f"live_stream_metrics:{session_id}", feedback_payload)

            elif msg_type == "end_session":
                logger.info("Client ended the session via WebSocket")
                await websocket.send_json({
                    "type": "session_ended",
                    "message": "Session ended.",
                    "final_transcript": accumulated_transcript.strip()
                })
                break

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except json.JSONDecodeError:
        logger.error("Received invalid JSON on WebSocket")
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Invalid JSON format"
            })
        except:
            pass
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
