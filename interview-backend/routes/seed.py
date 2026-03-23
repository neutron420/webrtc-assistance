import logging
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.domain import UserProfile, SessionLog, AnswerLog

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{user_id}", status_code=201)
async def seed_database(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Seeds the database with 5 historical mock interview sessions 
    showing a realistic improvement curve over time. 
    (Matches the "Demo readiness" requirement in the Project Rubric).
    """
    # 1. Ensure user exists
    user_result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = user_result.scalars().first()
    
    if not user:
        # Auto-create user for demo if it doesn't exist
        user = UserProfile(
            name="Demo User",
            email="demo@interviews.com",
            password_hash="mockhash",
            id=user_id
        )
        db.add(user)
        try:
            await db.commit()
            await db.refresh(user)
        except:
            await db.rollback()
            # If user creation fails because ID conflicts or similar, just use standard
            user_result = await db.execute(select(UserProfile).where(UserProfile.email == "demo@interviews.com"))
            user = user_result.scalars().first()

    # 2. Check if already seeded
    session_count_res = await db.execute(select(SessionLog).where(SessionLog.user_id == user.id))
    if len(session_count_res.scalars().all()) > 0:
        return {"message": "Database already contains sessions for this user. Clear DB first if you want a fresh seed."}

    logger.info(f"Seeding realistic progression data for user {user.id}")

    # 3. Create 5 historical sessions demonstrating improvement
    now = datetime.now(timezone.utc)

    # Session 1: 4 weeks ago (Poor performance)
    s1 = SessionLog(
        user_id=user.id, interview_type="behavioral", role="Software Engineer",
        difficulty="medium", company_target="general",
        avg_wpm=200.5, # Speaking too fast
        total_filler_words=35, # Too many filler words
        avg_eye_contact=40.0, # Poor eye contact
        overall_grade="C-", communication_score=50.0, technical_score=60.0, confidence_score=45.0,
        created_at=now - timedelta(days=28)
    )
    
    # Session 2: 3 weeks ago (Slight improvement)
    s2 = SessionLog(
        user_id=user.id, interview_type="technical_dsa", role="Software Engineer",
        difficulty="medium", company_target="google",
        avg_wpm=180.0, total_filler_words=25, avg_eye_contact=55.0,
        overall_grade="C+", communication_score=65.0, technical_score=68.0, confidence_score=60.0,
        created_at=now - timedelta(days=21)
    )

    # Session 3: 2 weeks ago (Solid progress)
    s3 = SessionLog(
        user_id=user.id, interview_type="system_design", role="Backend Engineer",
        difficulty="hard", company_target="amazon",
        avg_wpm=160.0, total_filler_words=15, avg_eye_contact=70.0,
        overall_grade="B", communication_score=75.0, technical_score=72.0, confidence_score=78.0,
        created_at=now - timedelta(days=14)
    )

    # Session 4: 1 week ago (Great performance)
    s4 = SessionLog(
        user_id=user.id, interview_type="behavioral", role="Senior Engineer",
        difficulty="hard", company_target="meta",
        avg_wpm=145.0, total_filler_words=8, avg_eye_contact=85.0,
        overall_grade="A-", communication_score=88.0, technical_score=85.0, confidence_score=90.0,
        created_at=now - timedelta(days=7)
    )

    # Session 5: Today (Excellent, ready for interview)
    s5 = SessionLog(
        user_id=user.id, interview_type="technical_dsa", role="Backend Engineer",
        difficulty="hard", company_target="apple",
        avg_wpm=135.0, # Perfect pace
        total_filler_words=2, # Barely any fillers
        avg_eye_contact=95.0, # Staring directly at camera
        overall_grade="A", communication_score=95.0, technical_score=92.0, confidence_score=98.0,
        created_at=now
    )

    db.add_all([s1, s2, s3, s4, s5])
    await db.commit()
    
    # We could also add AnswerLogs for these, but SessionLogs are primarily 
    # what the Progress Dashboard needs to render the charts.

    return {
        "status": "success",
        "message": "Seeded 5 historical mock sessions with a realistic improvement curve!",
        "user_id": user.id
    }
