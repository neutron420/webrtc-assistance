import logging
import asyncio
import os

logger = logging.getLogger(__name__)


class WhisperService:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            logger.warning("OPENAI_API_KEY not found.")
        else:
            logger.info("WhisperService initialized (requests-based for Windows stability).")

    async def transcribe_audio(self, file_path: str) -> dict:
        """
        Transcribes audio using the 'requests' library for maximum Windows compatibility.
        Returns a dict with 'text' and 'duration' for accurate WPM calculation.
        """
        import requests

        try:
            if not self.api_key:
                return {"text": "Placeholder text (No API Key)", "duration": 0}

            if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
                logger.error(f"Audio file is too small or missing: {file_path}")
                return {"text": "", "duration": 0}

            logger.info(f"Uploading {file_path} to OpenAI Whisper via Requests...")

            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {"Authorization": f"Bearer {self.api_key}"}

            def post_audio():
                with open(file_path, "rb") as f:
                    files = {"file": (os.path.basename(file_path), f, "audio/webm")}
                    data = {"model": "whisper-1", "response_format": "verbose_json"}
                    return requests.post(url, headers=headers, files=files, data=data, timeout=60)

            response = await asyncio.to_thread(post_audio)

            if response.status_code != 200:
                logger.error(f"OpenAI API Error {response.status_code}: {response.text}")
                return {"text": "", "duration": 0}

            result = response.json()
            text = (result.get('text', '') or "").strip()
            duration = result.get('duration', 0)  # Real audio duration from Whisper

            # Hallucination Filter
            hallucinations = [
                "thank you for watching", "thanks for watching",
                "you", "thanks", "thank you", "watching"
            ]
            if text.lower() in hallucinations:
                logger.info("Filtered Whisper hallucination.")
                return {"text": "", "duration": 0}

            logger.info(f"Transcription successful. Duration: {duration}s")
            return {"text": text, "duration": duration}

        except Exception as e:
            logger.error(f"Transcription Error: {str(e)}")
            if "Connection" in str(e):
                logger.error("CRITICAL: OpenAI API is unreachable. Check your internet or API Key.")
            return {"text": "", "duration": 0}
