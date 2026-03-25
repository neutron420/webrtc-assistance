import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)

# Common filler words and phrases to detect
FILLER_WORDS = [
    "um", "uh", "er", "ah", "like", "you know", "basically",
    "actually", "literally", "right", "so", "well", "i mean",
    "sort of", "kind of", "you see", "okay so", "hmm"
]


class AnalyticsService:
    """
    Handles audio analytics: filler word detection and WPM calculation.
    These run on Whisper transcription output.
    """

    def detect_filler_words(self, transcript: str) -> dict:
        """
        Scans the transcript for known filler words/phrases.
        Returns a dict with each filler word and its count.
        
        Example output: {"um": 3, "like": 5, "you know": 2}
        """
        if not transcript:
            return {}

        text_lower = transcript.lower()
        filler_counts = {}

        for filler in FILLER_WORDS:
            # Use word boundary regex to avoid partial matches
            # e.g., "like" shouldn't match "likely"
            pattern = r'\b' + re.escape(filler) + r'\b'
            count = len(re.findall(pattern, text_lower))
            if count > 0:
                filler_counts[filler] = count

        total = sum(filler_counts.values())
        logger.info(f"Detected {total} filler words in transcript")
        return filler_counts

    def get_filler_word_total(self, filler_counts: dict) -> int:
        """Returns the total count of all filler words."""
        return sum(filler_counts.values())

    def calculate_wpm(
        self,
        transcript: str,
        duration_seconds: Optional[float] = None
    ) -> float:
        """
        Calculates Words Per Minute from a transcript.
        
        If duration_seconds is provided (from Whisper timestamps), 
        uses that for accurate calculation.
        Otherwise, estimates duration from word count assuming ~2.5 words/second.
        """
        if not transcript or not transcript.strip():
            return 0.0

        word_count = len(transcript.split())

        if duration_seconds and duration_seconds > 0:
            minutes = duration_seconds / 60.0
            wpm = word_count / minutes
        else:
            # Estimate: average person speaks ~2.5 words per second
            estimated_duration = word_count / 2.5
            if estimated_duration > 0:
                wpm = word_count / (estimated_duration / 60.0)
            else:
                wpm = 0.0

        wpm = round(wpm, 1)
        logger.info(f"Calculated WPM: {wpm} ({word_count} words)")
        return wpm

    def generate_real_time_feedback(
        self,
        wpm: float,
        filler_count: int,
        eye_contact_score: float
    ) -> list[str]:
        """
        Generates real-time feedback cues to push to the frontend
        via WebSocket during an active interview session.
        
        Returns a list of feedback strings.
        """
        cues = []

        # WPM feedback
        if wpm > 180:
            cues.append("⚡ You're speaking very fast! Take a deep breath and slow down.")
        elif wpm > 160:
            cues.append("🐇 Slow down a little — you're speaking quickly.")
        elif wpm < 80:
            cues.append("🐢 Try to speak a bit faster to maintain engagement.")

        # Filler word feedback
        if filler_count > 10:
            cues.append("🚨 Too many filler words! Pause silently instead of saying 'um' or 'like'.")
        elif filler_count > 5:
            cues.append("⚠️ Watch your filler words — try replacing 'um' with a brief pause.")

        # Eye contact feedback
        if eye_contact_score < 30:
            cues.append("👀 Make more eye contact with the camera!")
        elif eye_contact_score < 50:
            cues.append("👁️ Try to look at the camera more often.")

        return cues


# Singleton instance
analytics_service = AnalyticsService()
