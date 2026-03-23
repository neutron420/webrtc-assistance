import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, WebSocket
from models.schema import TranscriptionResponse
from services.whisper_service import WhisperService

logger = logging.getLogger(__name__)

router = APIRouter()
whisper_service = WhisperService()

# Temporary directory to store uploaded audio blocks
UPLOAD_DIR = "temp_audio"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload-audio", response_model=TranscriptionResponse)
async def upload_audio(file: UploadFile = File(...)):
    """
    Endpoint to receive an audio file, save it temporarily, 
    and send it to the Whisper service for transcription.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_location = os.path.join(UPLOAD_DIR, file.filename)
    
    try:
        # Save file asynchronously
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        logger.info(f"File saved temporary at {file_location}")
        
        # Call whisper service to transcribe
        transcription_text = await whisper_service.transcribe_audio(file_location)
        
        return TranscriptionResponse(
            text=transcription_text,
            filename=file.filename
        )

    except Exception as e:
        logger.error(f"Error processing audio upload: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during audio processing")
    finally:
        # Clean up temporary file
        if os.path.exists(file_location):
            os.remove(file_location)
            logger.info(f"Cleaned up temporary file: {file_location}")

@router.websocket("/ws/audio-stream")
async def audio_stream_websocket(websocket: WebSocket):
    """
    BONUS: Placeholder WebSocket endpoint for future real-time audio streaming
    and real-time feedback processing.
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    try:
        while True:
            # Receive audio chunks from client
            data = await websocket.receive_bytes()
            logger.debug(f"Received audio chunk of size {len(data)} bytes")
            
            # Future implement: 
            # 1. Buffer audio chunks
            # 2. Process using streaming Whisper or similar
            # 3. Stream back transcription / real-time AI feedback
            # await websocket.send_text("Processing chunk...")
            pass
    except Exception as e:
        logger.warning(f"WebSocket connection closed or error: {str(e)}")
