from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InterviewType(str, Enum):
    BEHAVIORAL = "behavioral"
    TECHNICAL_DSA = "technical_dsa"
    SYSTEM_DESIGN = "system_design"
    ML_AI = "ml_ai"

class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class CompanyTarget(str, Enum):
    GOOGLE = "google"
    AMAZON = "amazon"
    META = "meta"
    APPLE = "apple"
    NETFLIX = "netflix"
    MICROSOFT = "microsoft"
    UBER = "uber"
    STRIPE = "stripe"
    AIRBNB = "airbnb"
    OPENAI = "openai"
    STARTUP = "startup"
    GENERAL = "general"


class HealthCheckResponse(BaseModel):
    status: str
    message: str

class UserCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    total_sessions: int = 0
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True




class SessionSetupRequest(BaseModel):
    """User picks interview type, role, difficulty, and optional company target."""
    user_id: int
    interview_type: InterviewType
    role: str = Field(..., description="e.g. 'Backend Engineer', 'ML Engineer'")
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    company_target: CompanyTarget = CompanyTarget.GENERAL
    num_questions: int = Field(default=5, ge=1, le=15)

class SessionSetupResponse(BaseModel):
    session_id: int
    interview_type: str
    role: str
    difficulty: str
    company_target: str
    questions: List[str]
    message: str



class TranscriptionResponse(BaseModel):
    text: str
    filename: str
    duration: Optional[float] = None
    wpm: Optional[float] = None
    filler_words: Optional[dict] = None
    filler_word_count: Optional[int] = None




class EyeContactUpdate(BaseModel):
    """Frontend MediaPipe sends these metrics periodically."""
    session_id: int
    eye_contact_score: float = Field(..., ge=0.0, le=100.0)
    confidence_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    posture_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    facial_expression: Optional[str] = None


class AnswerSubmission(BaseModel):
    """Submit a single answer for evaluation."""
    session_id: int
    question_index: int
    question_text: str
    transcript: str
    wpm: Optional[float] = None
    filler_word_count: Optional[int] = None
    eye_contact_score: Optional[float] = None
    confidence_score: Optional[float] = None

class ScorecardResponse(BaseModel):
    session_id: int
    question_text: str
    transcript: Optional[str] = None
    relevance_score: float
    completeness_score: float
    star_structure_feedback: str
    technical_grade: str
    full_feedback: str
    wpm: Optional[float] = None
    filler_word_count: Optional[int] = None
    eye_contact_score: Optional[float] = None
    confidence_level: Optional[float] = None

class FinalizeRequest(BaseModel):
    forced_status: Optional[str] = None
    security_summary: Optional[str] = None

class FullScorecardResponse(BaseModel):
    session_id: int
    interview_type: str
    role: str
    company_target: str
    overall_grade: str
    answers: List[ScorecardResponse]
    communication_score: float
    confidence_score: float
    technical_score: float
    recommendations: List[str]



class SessionSummary(BaseModel):
    session_id: int
    interview_type: str
    role: str
    company_target: str
    overall_grade: str
    communication_score: float
    technical_score: float
    confidence_score: float
    wpm_avg: Optional[float] = None
    filler_words_total: Optional[int] = None
    eye_contact_avg: Optional[float] = None
    created_at: Optional[datetime] = None

class ProgressResponse(BaseModel):
    user_id: int
    total_sessions: int
    sessions: List[SessionSummary]
    improvement_trends: dict
    strengths: List[str]
    weaknesses: List[str]


class StudyPlanRequest(BaseModel):
    user_id: int
    focus_areas: Optional[List[str]] = None

class StudyPlanResponse(BaseModel):
    user_id: int
    plan_title: str
    weekly_plan: List[dict]
    recommended_topics: List[str]
    practice_questions: List[str]
    resources: List[str]
