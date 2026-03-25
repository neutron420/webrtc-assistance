import logging
import asyncio
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class WhisperService:
    def __init__(self):
        # Initialize OpenAI client using the environment variable
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
            logger.info("WhisperService initialized with OpenAI API.")
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY not found. Whisper service will use placeholders.")

    async def transcribe_audio(self, file_path: str) -> str:
        """
        Transcribes the given audio file using OpenAI's Whisper-1 model.
        """
        try:
            logger.info(f"Starting transcription for {file_path}")
            
            if not self.client:
                # Fallback placeholder if no API key is provided
                await asyncio.sleep(0.5)
                logger.warning("No OpenAI client; returning placeholder text.")
                return "This is a placeholder transcribed text. Please provide an OPENAI_API_KEY for real transcription."

            # Perform transcription using the OpenAI API
            with open(file_path, "rb") as audio_file:
                transcript = await self.client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file
                )
            
            text = (transcript.text or "").strip()
            
            # Basic hallucination filter for Whisper (often returns these for silence/noise)
            hallucinations = ["thank you for watching", "thanks for watching", "you", "thanks", "thank you"]
            if text.lower() in hallucinations:
                logger.info(f"Filtered probable Whisper hallucination: '{text}'")
                return ""

            logger.info(f"Successfully transcribed {file_path}")
            return text

        except Exception as e:
            logger.error(f"Error during transcription: {str(e)}")
            return "" # Return empty on error to avoid breaking the flow
