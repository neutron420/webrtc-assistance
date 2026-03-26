import logging
import asyncio
import os
import time

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

    async def transcribe_audio_bytes(self, audio_bytes: bytes, retries: int = 3) -> dict:
        """
        Transcribes audio bytes (for streaming/real-time transcription).
        Used for live audio chunks from WebSocket.
        
        Features:
        - Retry logic with exponential backoff
        - Minimum chunk size validation
        - Connection timeout handling
        """
        import requests
        import io

        try:
            if not self.api_key:
                return {"text": "", "duration": 0}

            # Require minimum 500 bytes to avoid too-small chunks
            if len(audio_bytes) < 500:
                logger.debug(f"Audio chunk too small ({len(audio_bytes)} bytes), skipping transcription")
                return {"text": "", "duration": 0}

            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {"Authorization": f"Bearer {self.api_key}"}

            def post_audio_with_retry(attempt: int = 1):
                try:
                    audio_file = io.BytesIO(audio_bytes)
                    files = {"file": ("chunk.wav", audio_file, "audio/wav")}
                    data = {"model": "whisper-1", "response_format": "verbose_json"}
                    
                    # Increase timeout and add connection pool timeout
                    response = requests.post(
                        url, 
                        headers=headers, 
                        files=files, 
                        data=data, 
                        timeout=(10, 30),  # (connection timeout, read timeout)
                        allow_redirects=True
                    )
                    return response
                except (requests.ConnectionError, requests.Timeout) as e:
                    if attempt < retries:
                        wait_time = 2 ** (attempt - 1)  # Exponential backoff: 1s, 2s, 4s
                        logger.warning(f"Connection error (attempt {attempt}/{retries}), retrying in {wait_time}s: {str(e)}")
                        time.sleep(wait_time)
                        return post_audio_with_retry(attempt + 1)
                    else:
                        raise

            response = await asyncio.to_thread(post_audio_with_retry)

            if response.status_code == 429:
                logger.warning("OpenAI rate limit hit, skipping this chunk")
                return {"text": "", "duration": 0}
            
            if response.status_code != 200:
                logger.debug(f"Whisper API error {response.status_code}: {response.text}")
                return {"text": "", "duration": 0}

            result = response.json()
            text = (result.get('text', '') or "").strip()
            duration = result.get('duration', 0)

            # Only return non-empty transcriptions
            if text and len(text) > 2:  # Avoid single character noise
                logger.info(f"Stream transcription: {text}")
                return {"text": text, "duration": duration}
            
            return {"text": "", "duration": 0}

        except Exception as e:
            logger.error(f"Streaming transcription error: {str(e)}")
            return {"text": "", "duration": 0}
