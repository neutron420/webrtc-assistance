import logging
import asyncio
import os
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class WhisperService:
    def __init__(self):
        from openai import OpenAI
        import httpx
        import os
        self.api_key = os.getenv("OPENAI_API_KEY")
        if self.api_key:
            # Using a custom httpx client to bypass potential system proxy issues on Windows
            http_client = httpx.Client(
                timeout=60.0,
                trust_env=False  # Ignore local proxy settings that might be breaking the connection
            )
            self.client = OpenAI(
                api_key=self.api_key,
                http_client=http_client
            )
            logger.info("WhisperService initialized with stable Synchronous OpenAI Client.")
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY not found.")

    async def transcribe_audio(self, file_path: str) -> str:
        """
        Transcribes audio using a thread-safe synchronous call to avoid async network bugs.
        """
        try:
            if not self.client:
                return "Placeholder text (No API Key)"

            if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
                logger.error(f"Audio file is too small or missing: {file_path}")
                return ""

            logger.info(f"Uploading {file_path} to OpenAI Whisper...")
            
            # Wrap synchronous call in a thread to keep the server responsive
            def perform_transcription():
                with open(file_path, "rb") as audio_file:
                    return self.client.audio.transcriptions.create(
                        model="whisper-1", 
                        file=audio_file,
                        response_format="verbose_json"
                    )

            transcript = await asyncio.to_thread(perform_transcription)
            
            text = (getattr(transcript, 'text', '') or "").strip()
            
            # Hallucination Filter
            hallucinations = ["thank you for watching", "thanks for watching", "you", "thanks", "thank you", "watching"]
            if text.lower() in hallucinations:
                logger.info("Filtered Whisper hallucination.")
                return ""

            logger.info("Transcription successful.")
            return text

        except Exception as e:
            logger.error(f"Transcription Error [{type(e).__name__}]: {str(e)}")
            # If it's a connection error, suggest a check
            if "Connection" in str(e) or "APIConnectionError" in type(e).__name__:
                logger.error("CRITICAL: OpenAI API is unreachable. Check your internet or API Key.")
            return ""
