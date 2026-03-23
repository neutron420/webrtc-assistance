from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base


class UserProfile(Base):
    """Stores user account information and credentials."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    sessions = relationship("SessionLog", back_populates="user", cascade="all, delete-orphan")


class SessionLog(Base):
    """
    Stores each mock interview session.
    Linked to a user, contains interview config and aggregated metrics.
    """
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Interview configuration
    interview_type = Column(String(50), nullable=False)   # behavioral, technical_dsa, system_design, ml_ai
    role = Column(String(100), nullable=False)             # e.g. "Backend Engineer"
    difficulty = Column(String(20), default="medium")      # easy, medium, hard
    company_target = Column(String(50), default="general") # google, amazon, meta, startup, etc.
    questions_json = Column(Text, default="[]")            # JSON list of generated questions

    # Aggregated metrics (updated after each answer)
    avg_wpm = Column(Float, default=0.0)
    total_filler_words = Column(Integer, default=0)
    avg_eye_contact = Column(Float, default=0.0)

    # Final scores (computed at end of session)
    overall_grade = Column(String(10), default="N/A")
    communication_score = Column(Float, default=0.0)
    technical_score = Column(Float, default=0.0)
    confidence_score = Column(Float, default=0.0)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("UserProfile", back_populates="sessions")
    answers = relationship("AnswerLog", back_populates="session", cascade="all, delete-orphan")


class AnswerLog(Base):
    """
    Stores each individual answer within a session.
    Contains the question, transcript, metrics, and GPT evaluation.
    """
    __tablename__ = "answers"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    question_index = Column(Integer, nullable=False)
    question_text = Column(Text, nullable=False)

    # Whisper transcription
    transcript = Column(Text, default="")

    # Audio analytics
    wpm = Column(Float, default=0.0)
    filler_word_count = Column(Integer, default=0)
    filler_words_detail = Column(Text, default="{}")  # JSON dict of filler words found

    # CV metrics from frontend MediaPipe
    eye_contact_score = Column(Float, default=0.0)
    posture_score = Column(Float, default=0.0)

    # GPT-4o evaluation
    relevance_score = Column(Float, default=0.0)
    completeness_score = Column(Float, default=0.0)
    star_structure_feedback = Column(Text, default="")
    technical_grade = Column(String(10), default="N/A")
    full_feedback = Column(Text, default="")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    session = relationship("SessionLog", back_populates="answers")
