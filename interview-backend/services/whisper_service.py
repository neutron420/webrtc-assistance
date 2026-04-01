import logging
import asyncio
import os
import time
import struct

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

    @staticmethod
    def _pcm16le_to_wav(audio_bytes: bytes, sample_rate: int = 16000, channels: int = 1) -> bytes:
        """
        Wrap raw PCM16 little-endian bytes in a WAV container.
        Groq transcription endpoints require a valid media file, not raw PCM payloads.
        """
        bits_per_sample = 16
        block_align = channels * (bits_per_sample // 8)
        byte_rate = sample_rate * block_align
        data_size = len(audio_bytes)
        riff_chunk_size = 36 + data_size

        header = b"".join([
            b"RIFF",
            struct.pack("<I", riff_chunk_size),
            b"WAVE",
            b"fmt ",
            struct.pack("<IHHIIHH", 16, 1, channels, sample_rate, byte_rate, block_align, bits_per_sample),
            b"data",
            struct.pack("<I", data_size),
        ])

        return header + audio_bytes

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
                        language="en",
                        temperature=0,
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
                        data = {"model": "whisper-1", "response_format": "verbose_json", "language": "en", "temperature": 0}
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

    async def transcribe_audio_bytes(self, audio_bytes: bytes, sample_rate: int = 16000, retries: int = 3) -> dict:
        """
        Transcribes audio bytes (for streaming/real-time transcription).
        """
        if len(audio_bytes) < 500:
            return {"text": "", "duration": 0}

        try:
            if self.groq_api_key:
                safe_sample_rate = int(sample_rate) if sample_rate and sample_rate > 0 else 16000
                wav_bytes = self._pcm16le_to_wav(audio_bytes, sample_rate=safe_sample_rate, channels=1)
                transcription = await self.client.audio.transcriptions.create(
                    file=("chunk.wav", wav_bytes),
                    model="whisper-large-v3",
                    response_format="verbose_json",
                    language="en",
                    temperature=0,
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
