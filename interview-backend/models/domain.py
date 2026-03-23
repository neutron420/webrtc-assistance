from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class UserProfile(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    
    sessions = relationship("SessionLog", back_populates="user")

class SessionLog(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    question_asked = Column(String)
    audio_transcript = Column(String)
    wpm = Column(Float) # Calculated from Whisper transcription
    eye_contact_score = Column(Float) # Tracked by frontend MediaPipe
    filler_words_count = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("UserProfile", back_populates="sessions")
    scorecard = relationship("Scorecard", back_populates="session", uselist=False)

class Scorecard(Base):
    __tablename__ = "scorecards"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    
    star_relevance = Column(String) # LLM feedback on relevance
    star_completeness = Column(String) # LLM feedback on completeness
    technical_grade = Column(String) # LLM technical grade
    full_feedback = Column(String)
    
    session = relationship("SessionLog", back_populates="scorecard")
