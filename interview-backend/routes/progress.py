import logging
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.domain import UserProfile, SessionLog
from models.schema import (
    ProgressResponse,
    SessionSummary,
    StudyPlanRequest,
    StudyPlanResponse,
)
from services.llm_service import llm_service
from services.redis_service import redis_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/{user_id}", response_model=ProgressResponse)
async def get_progress(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetches all past sessions for a user and computes improvement trends.
    
    Returns:
    - List of all session summaries
    - Improvement trends (comparing recent vs older sessions)
    - Identified strengths and weaknesses
    """
    
    # ⚡ 1. Fast Path: Check Enterprise Redis Cache First ⚡
    cache_key = f"user_progress:{user_id}"
    cached_data = await redis_service.get_cache(cache_key)
    if cached_data:
        return ProgressResponse(**cached_data)

    # 2. Slow Path: Validate user and query PostgreSQL
    user_result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch all sessions ordered by date
    sessions_result = await db.execute(
        select(SessionLog)
        .where(SessionLog.user_id == user_id)
        .order_by(SessionLog.created_at.desc())
    )
    sessions = sessions_result.scalars().all()

    if not sessions:
        return ProgressResponse(
            user_id=user_id,
            total_sessions=0,
            sessions=[],
            improvement_trends={},
            strengths=["Complete your first session to see strengths!"],
            weaknesses=["Complete your first session to see areas for improvement!"],
        )

    # Build session summaries
    session_summaries = [
        SessionSummary(
            session_id=s.id,
            interview_type=s.interview_type,
            role=s.role,
            company_target=s.company_target,
            overall_grade=s.overall_grade,
            communication_score=s.communication_score,
            technical_score=s.technical_score,
            confidence_score=s.confidence_score,
            wpm_avg=s.avg_wpm,
            filler_words_total=s.total_filler_words,
            eye_contact_avg=s.avg_eye_contact,
            created_at=s.created_at,
        )
        for s in sessions
    ]

    # Calculate improvement trends
    trends = _calculate_trends(sessions)
    strengths, weaknesses = _identify_strengths_weaknesses(sessions)

    logger.info(f"Progress fetched for user {user_id}: {len(sessions)} sessions")

    response = ProgressResponse(
        user_id=user_id,
        total_sessions=len(sessions),
        sessions=session_summaries,
        improvement_trends=trends,
        strengths=strengths,
        weaknesses=weaknesses,
    )
    
    # 💾 3. Store result in Redis Cache for 5 minutes (300 seconds) 💾
    await redis_service.set_cache(cache_key, response.model_dump(mode="json"), expire_seconds=300)

    return response


@router.post("/study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(req: StudyPlanRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a personalized study plan based on user's past performance.
    Uses GPT-4o to create a weekly plan targeting weak areas.
    """
    # Validate user
    user_result = await db.execute(select(UserProfile).where(UserProfile.id == req.user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch past sessions for analysis
    sessions_result = await db.execute(
        select(SessionLog)
        .where(SessionLog.user_id == req.user_id)
        .order_by(SessionLog.created_at.desc())
        .limit(10)
    )
    sessions = sessions_result.scalars().all()

    session_data = [
        {
            "type": s.interview_type,
            "grade": s.overall_grade,
            "communication": s.communication_score,
            "technical": s.technical_score,
            "confidence": s.confidence_score,
            "wpm": s.avg_wpm,
            "fillers": s.total_filler_words,
            "eye_contact": s.avg_eye_contact,
        }
        for s in sessions
    ]

    # Generate study plan via LLM
    plan = await llm_service.generate_study_plan(
        user_name=user.name,
        session_summaries=session_data,
        focus_areas=req.focus_areas,
    )

    logger.info(f"Study plan generated for user {req.user_id}")

    return StudyPlanResponse(
        user_id=req.user_id,
        plan_title=plan["plan_title"],
        weekly_plan=plan["weekly_plan"],
        recommended_topics=plan["recommended_topics"],
        practice_questions=plan["practice_questions"],
        resources=plan["resources"],
    )


# ──────────────────────────────────────────────
# Helper functions for trend analysis
# ──────────────────────────────────────────────

def _calculate_trends(sessions: list) -> dict:
    """
    Compares recent sessions vs older sessions 
    to identify improvement or regression trends.
    """
    if len(sessions) < 2:
        return {
            "communication": "not_enough_data",
            "technical": "not_enough_data",
            "confidence": "not_enough_data",
            "filler_words": "not_enough_data",
            "eye_contact": "not_enough_data",
        }

    # Split into recent (first half) and older (second half)
    midpoint = len(sessions) // 2
    recent = sessions[:midpoint]
    older = sessions[midpoint:]

    def avg(items, attr):
        vals = [getattr(s, attr) or 0 for s in items]
        return sum(vals) / len(vals) if vals else 0

    def trend_label(recent_avg, older_avg):
        diff = recent_avg - older_avg
        if diff > 5:
            return "improving"
        elif diff < -5:
            return "declining"
        else:
            return "stable"

    return {
        "communication": trend_label(avg(recent, "communication_score"), avg(older, "communication_score")),
        "technical": trend_label(avg(recent, "technical_score"), avg(older, "technical_score")),
        "confidence": trend_label(avg(recent, "confidence_score"), avg(older, "confidence_score")),
        "filler_words": trend_label(
            -avg(recent, "total_filler_words"),  # Negative because fewer is better
            -avg(older, "total_filler_words")
        ),
        "eye_contact": trend_label(avg(recent, "avg_eye_contact"), avg(older, "avg_eye_contact")),
    }


def _identify_strengths_weaknesses(sessions: list) -> tuple:
    """
    Analyzes the most recent sessions to identify 
    user's top strengths and areas needing improvement.
    """
    recent = sessions[:5]  # Last 5 sessions

    def avg(attr):
        vals = [getattr(s, attr) or 0 for s in recent]
        return sum(vals) / len(vals) if vals else 0

    scores = {
        "Communication": avg("communication_score"),
        "Technical Knowledge": avg("technical_score"),
        "Confidence": avg("confidence_score"),
        "Eye Contact": avg("avg_eye_contact"),
    }

    filler_avg = avg("total_filler_words")

    strengths = []
    weaknesses = []

    for label, score in scores.items():
        if score >= 70:
            strengths.append(f"✅ {label} ({score:.0f}/100)")
        elif score < 50:
            weaknesses.append(f"⚠️ {label} needs improvement ({score:.0f}/100)")

    if filler_avg < 3:
        strengths.append("✅ Minimal filler word usage")
    elif filler_avg > 8:
        weaknesses.append(f"⚠️ High filler word usage (avg {filler_avg:.0f} per session)")

    if not strengths:
        strengths.append("Keep practicing — your strengths will emerge!")
    if not weaknesses:
        weaknesses.append("Great job! No major weaknesses detected.")

    return strengths, weaknesses
