import logging
import asyncio
import os
import time

logger = logging.getLogger(__name__)


class WhisperService:
    def __init__(self):
        import os
        from groq import AsyncGroq
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if self.groq_api_key:
            self.client = AsyncGroq(api_key=self.groq_api_key)
            logger.info("WhisperService initialized with Groq (ultra-fast transcription).")
        else:
            self.client = None
            logger.warning("GROQ_API_KEY not found. Falling back to OpenAI (legacy).")

    async def transcribe_audio(self, file_path: str) -> dict:
        """
        Transcribes audio using Groq Whisper (preferentially) or OpenAI.
        """
        try:
            if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
                logger.error(f"Audio file is too small or missing: {file_path}")
                return {"text": "", "duration": 0}

            if self.groq_api_key:
                logger.info(f"Transcribing {file_path} via Groq Whisper...")
                with open(file_path, "rb") as f:
                    transcription = await self.client.audio.transcriptions.create(
                        file=(os.path.basename(file_path), f.read()),
                        model="whisper-large-v3",
                        response_format="verbose_json",
                    )
                text = transcription.text.strip()
                duration = getattr(transcription, "duration", 0)
            elif self.openai_api_key:
                import requests
                logger.info(f"Uploading {file_path} to OpenAI Whisper via Requests...")
                url = "https://api.openai.com/v1/audio/transcriptions"
                headers = {"Authorization": f"Bearer {self.openai_api_key}"}
                
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
                text = result.get('text', '').strip()
                duration = result.get('duration', 0)
            else:
                return {"text": "Placeholder (No API Key)", "duration": 0}

            # Hallucination Filter
            hallucinations = ["thank you for watching", "thanks for watching", "you", "thanks", "thank you", "watching"]
            if text.lower() in hallucinations:
                return {"text": "", "duration": 0}

            logger.info(f"Transcription successful. Duration: {duration}s")
            return {"text": text, "duration": duration}

        except Exception as e:
            logger.error(f"Transcription Error: {str(e)}")
            return {"text": "", "duration": 0}

    async def transcribe_audio_bytes(self, audio_bytes: bytes, retries: int = 3) -> dict:
        """
        Transcribes audio bytes (for streaming/real-time transcription).
        """
        if len(audio_bytes) < 500:
            return {"text": "", "duration": 0}

        try:
            if self.groq_api_key:
                # Groq is fast enough that we don't need heavy retry logic here usually
                transcription = await self.client.audio.transcriptions.create(
                    file=("chunk.wav", audio_bytes),
                    model="whisper-large-v3",
                    response_format="verbose_json",
                )
                text = transcription.text.strip()
                duration = getattr(transcription, "duration", 0)
                if text and len(text) > 2:
                    return {"text": text, "duration": duration}
                return {"text": "", "duration": 0}
            
            # Fallback to legacy OpenAI requests logic if needed...
            # (Keeping it simple for now as Groq is the priority)
            return {"text": "", "duration": 0}

        except Exception as e:
            logger.error(f"Streaming transcription error: {str(e)}")
            return {"text": "", "duration": 0}
