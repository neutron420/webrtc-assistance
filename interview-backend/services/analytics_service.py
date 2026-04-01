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

    def calculate_confidence_score(
        self,
        wpm: float,
        filler_count: int,
        eye_contact_score: float
    ) -> float:
        """
        Heuristic-based confidence score (0-100).
        High confidence = Steady pacing (120-150 WPM), low fillers, high eye contact.
        """
        score = 100.0
        
        # Pacing penalty (too slow or too fast)
        if wpm < 80 or wpm > 180:
            score -= 20
        elif wpm < 100 or wpm > 160:
            score -= 10
            
        # Filler word penalty
        score -= (filler_count * 5)
        
        # Eye contact influence
        score = (score * 0.6) + (eye_contact_score * 0.4)
        
        return max(0.0, min(100.0, round(score, 1)))

    def generate_real_time_feedback(
        self,
        wpm: float,
        filler_count: int,
        eye_contact_score: float,
        mood: Optional[str] = None
    ) -> list[str]:
        """
        Generates real-time feedback cues with a more 'encouraging coach' tone.
        """
        cues = []

        # WPM feedback
        if wpm > 180:
            cues.append("🚀 Slow down! You're racing. Try to pause between sentences.")
        elif wpm > 165:
            cues.append("🐎 Pacing is a bit fast. Take a breath.")
        elif wpm > 0 and wpm < 90:
            cues.append("🐢 Try to speak with a bit more energy and speed.")

        # Filler word feedback
        if filler_count > 8:
            cues.append("🚨 Watch the fillers ('um', 'like'). Try a silent pause instead.")
        elif filler_count > 3:
            cues.append("⚠️ A few too many fillers. You're doing great, just stay conscious of them.")

        # Eye contact feedback
        if eye_contact_score < 40:
            cues.append("👀 Look at the camera to build a connection with the interviewer.")
        elif eye_contact_score < 65:
            cues.append("👁️ Good, but try to maintain eye contact more consistently.")

        # Mood feedback (New!)
        if mood == "Surprised / Nervous":
            cues.append("🧘 You look a bit tense. Relax your shoulders and take a deep breath.")
        elif mood == "Neutral" and wpm > 0:
            # Randomly encourage to smile if they've been neutral for a while (would need state, but let's keep it simple)
            pass 

        # Keep a visible live-feedback signal when user is speaking and no correction is needed.
        if not cues and wpm > 0:
            cues.append("✅ Good pacing and delivery. Keep this rhythm.")

        return cues


# Singleton instance
analytics_service = AnalyticsService()
