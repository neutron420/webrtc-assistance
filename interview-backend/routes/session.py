import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.domain import UserProfile, SessionLog
from models.schema import SessionSetupRequest, SessionSetupResponse
from services.question_service import question_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/setup", response_model=SessionSetupResponse)
async def setup_session(req: SessionSetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Creates a new interview session.
    
    1. Validates the user exists
    2. Generates interview questions based on type, role, difficulty, and company
    3. Saves the session to the database
    4. Returns the session ID and generated questions
    """
    # Validate user exists
    result = await db.execute(select(UserProfile).where(UserProfile.id == req.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate questions from question service
    questions = await question_service.generate_questions(
        interview_type=req.interview_type.value,
        role=req.role,
        difficulty=req.difficulty.value,
        company_target=req.company_target.value,
        num_questions=req.num_questions,
    )

    # Create session record in database
    session = SessionLog(
        user_id=req.user_id,
        interview_type=req.interview_type.value,
        role=req.role,
        difficulty=req.difficulty.value,
        company_target=req.company_target.value,
        questions_json=json.dumps(questions),
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    logger.info(f"Created session {session.id} for user {req.user_id} ({req.interview_type.value})")

    return SessionSetupResponse(
        session_id=session.id,
        interview_type=req.interview_type.value,
        role=req.role,
        difficulty=req.difficulty.value,
        company_target=req.company_target.value,
        questions=questions,
        message=f"Session created! You have {len(questions)} questions. Good luck!"
    )


@router.get("/{session_id}/questions")
async def get_session_questions(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieves the questions for an existing session.
    Useful for resuming a session or re-fetching questions.
    """
    result = await db.execute(select(SessionLog).where(SessionLog.id == session_id))
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    questions = json.loads(session.questions_json)
    return {
        "session_id": session.id,
        "interview_type": session.interview_type,
        "role": session.role,
        "difficulty": session.difficulty,
        "company_target": session.company_target,
        "questions": questions,
    }
