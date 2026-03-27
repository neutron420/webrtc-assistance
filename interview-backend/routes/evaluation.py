import json
import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.domain import SessionLog, AnswerLog
from models.schema import (
    AnswerSubmission,
    ScorecardResponse,
    FullScorecardResponse,
    EyeContactUpdate,
    FinalizeRequest,
)
from services.llm_service import llm_service
from services.analytics_service import analytics_service
from services.redis_service import redis_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/submit-answer", response_model=ScorecardResponse)
async def submit_answer(req: AnswerSubmission, db: AsyncSession = Depends(get_db)):
    """
    Submit a single answer for GPT-4o evaluation.
    
    Flow:
    1. Detect filler words in the transcript
    2. Send question + transcript to GPT-4o for STAR evaluation
    3. Store the answer and evaluation in the database
    4. Update session aggregated metrics
    5. Return the scorecard for this answer
    """
    # Validate session exists
    result = await db.execute(select(SessionLog).where(SessionLog.id == req.session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.is_finalized == 1:
        raise HTTPException(status_code=403, detail="Session is already finalized and locked")

    # 1. Analyze the transcript for filler words
    filler_counts = analytics_service.detect_filler_words(req.transcript)
    filler_total = analytics_service.get_filler_word_total(filler_counts)

    # 2. Call LLM for STAR evaluation
    evaluation = await llm_service.evaluate_answer(
        question=req.question_text,
        transcript=req.transcript,
        interview_type=session.interview_type,
        company_target=session.company_target,
    )

    # 3. Save answer to database
    answer = AnswerLog(
        session_id=req.session_id,
        question_index=req.question_index,
        question_text=req.question_text,
        transcript=req.transcript,
        wpm=req.wpm or 0.0,
        filler_word_count=filler_total,
        filler_words_detail=json.dumps(filler_counts),
        eye_contact_score=req.eye_contact_score or 0.0,
        relevance_score=evaluation["relevance_score"],
        completeness_score=evaluation["completeness_score"],
        star_structure_feedback=evaluation["star_structure_feedback"],
        technical_grade=evaluation["technical_grade"],
        full_feedback=evaluation["full_feedback"],
    )
    db.add(answer)

    # 4. Update session aggregated metrics
    all_answers_result = await db.execute(
        select(AnswerLog).where(AnswerLog.session_id == req.session_id)
    )
    all_answers = all_answers_result.scalars().all()
    answer_count = len(all_answers) + 1  # +1 for the new answer not yet committed

    # Running average for WPM
    total_wpm = sum(a.wpm for a in all_answers) + (req.wpm or 0.0)
    session.avg_wpm = round(total_wpm / answer_count, 1)

    # Running total for filler words
    session.total_filler_words = sum(a.filler_word_count for a in all_answers) + filler_total

    # Running average for eye contact
    total_eye = sum(a.eye_contact_score for a in all_answers) + (req.eye_contact_score or 0.0)
    session.avg_eye_contact = round(total_eye / answer_count, 1)

    await db.commit()
    await db.refresh(answer)

    logger.info(f"Answer submitted for session {req.session_id}, question {req.question_index}")

    return ScorecardResponse(
        session_id=req.session_id,
        question_text=req.question_text,
        relevance_score=evaluation["relevance_score"],
        completeness_score=evaluation["completeness_score"],
        star_structure_feedback=evaluation["star_structure_feedback"],
        technical_grade=evaluation["technical_grade"],
        full_feedback=evaluation["full_feedback"],
        wpm=req.wpm,
        filler_word_count=filler_total,
        eye_contact_score=req.eye_contact_score,
    )


@router.post("/eye-contact")
async def update_eye_contact(req: EyeContactUpdate, db: AsyncSession = Depends(get_db)):
    """
    Receives real-time eye contact scores from the frontend MediaPipe.
    Updates the session's running average.
    """
    result = await db.execute(select(SessionLog).where(SessionLog.id == req.session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.is_finalized == 1:
        raise HTTPException(status_code=403, detail="Session is already finalized and locked")

    # Update running average (simple exponential moving average)
    alpha = 0.3  # Weight for new data
    session.avg_eye_contact = round(
        (1 - alpha) * session.avg_eye_contact + alpha * req.eye_contact_score, 1
    )

    await db.commit()
    logger.info(f"Eye contact updated for session {req.session_id}: {req.eye_contact_score}%")

    return {
        "status": "updated",
        "session_id": req.session_id,
        "current_eye_contact_avg": session.avg_eye_contact,
    }


@router.post("/finalize/{session_id}", response_model=FullScorecardResponse)
async def finalize_session(session_id: int, req: Optional[FinalizeRequest] = None, db: AsyncSession = Depends(get_db)):
    """
    Finalizes a session and generates the comprehensive post-interview scorecard.
    
    Combines all answer evaluations into overall grades,
    communication, technical, and confidence scores.
    """
    result = await db.execute(select(SessionLog).where(SessionLog.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get all answers for this session
    answers_result = await db.execute(
        select(AnswerLog).where(AnswerLog.session_id == session_id).order_by(AnswerLog.question_index)
    )
    answers = answers_result.scalars().all()

    # Handle N/A or empty session
    if req and req.forced_status == "N/A":
        session.overall_grade = "N/A"
        session.is_finalized = 1
        await db.commit()
        
        reason = req.security_summary if req.security_summary else "Excessive security violations."
        return FullScorecardResponse(
            session_id=session.id,
            interview_type=session.interview_type,
            role=session.role,
            company_target=session.company_target,
            overall_grade="N/A",
            answers=[],
            communication_score=0.0,
            confidence_score=0.0,
            technical_score=0.0,
            recommendations=[f"Session terminated: {reason}"]
        )

    if not answers:
        raise HTTPException(status_code=400, detail="No answers submitted for this session")

    # Prepare evaluation data for GPT grading
    evaluations = [
        {
            "relevance_score": a.relevance_score,
            "completeness_score": a.completeness_score,
        }
        for a in answers
    ]

    # Compute overall grades via LLM service
    overall = await llm_service.compute_overall_grade(evaluations)

    # Update session with final scores
    session.overall_grade = overall["overall_grade"]
    session.communication_score = overall["communication_score"]
    session.technical_score = overall["technical_score"]
    session.confidence_score = overall["confidence_score"]
    session.is_finalized = 1 # Mark session as locked

    # Build individual answer scorecards
    answer_scorecards = [
        ScorecardResponse(
            session_id=session_id,
            question_text=a.question_text,
            relevance_score=a.relevance_score,
            completeness_score=a.completeness_score,
            star_structure_feedback=a.star_structure_feedback,
            technical_grade=a.technical_grade,
            full_feedback=a.full_feedback,
            wpm=a.wpm,
            filler_word_count=a.filler_word_count,
            eye_contact_score=a.eye_contact_score,
        )
        for a in answers
    ]

    logger.info(f"Session {session_id} finalized with grade: {overall['overall_grade']}")
    
    # Store session values before commit to avoid expiration error
    s_id = session.id
    s_type = session.interview_type
    s_role = session.role
    s_company = session.company_target
    u_id = session.user_id

    # 🧹 Invalidate Cache: 
    # The user's dashboard must be updated instantly instead of waiting 5 mins!
    await redis_service.invalidate_cache(f"user_progress:{u_id}")
    await db.commit()

    return FullScorecardResponse(
        session_id=s_id,
        interview_type=s_type,
        role=s_role,
        company_target=s_company,
        overall_grade=overall["overall_grade"],
        answers=answer_scorecards,
        communication_score=overall["communication_score"],
        confidence_score=overall["confidence_score"],
        technical_score=overall["technical_score"],
        recommendations=overall["recommendations"],
    )

@router.get("/session/{session_id}", response_model=FullScorecardResponse)
async def get_scorecard(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Fetches an existing scorecard from the database.
    """
    result = await db.execute(select(SessionLog).where(SessionLog.id == session_id))
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not session.overall_grade:
        raise HTTPException(status_code=400, detail="Session is not yet finalized")

    # Get all answers
    answers_result = await db.execute(
        select(AnswerLog).where(AnswerLog.session_id == session_id).order_by(AnswerLog.question_index)
    )
    answers = answers_result.scalars().all()

    answer_scorecards = [
        ScorecardResponse(
            session_id=session_id,
            question_text=a.question_text,
            relevance_score=a.relevance_score,
            completeness_score=a.completeness_score,
            star_structure_feedback=a.star_structure_feedback,
            technical_grade=a.technical_grade,
            full_feedback=a.full_feedback,
            wpm=a.wpm,
            filler_word_count=a.filler_word_count,
            eye_contact_score=a.eye_contact_score,
        )
        for a in answers
    ]

    # Generate dynamic recommendations based on REAL session data
    recommendations = []
    if (session.communication_score or 0) < 60:
        recommendations.append("Practice structuring your answers using the STAR method.")
    if (session.technical_score or 0) < 60:
        recommendations.append("Review core concepts and practice explaining them clearly.")
    if (session.confidence_score or 0) < 60:
        recommendations.append("Slow down, take a breath, and speak with conviction.")
    if (session.avg_eye_contact or 0) < 50:
        recommendations.append("Focus on maintaining eye contact with the camera during answers.")
    if (session.total_filler_words or 0) > 10:
        recommendations.append("Reduce filler words — try pausing instead of saying 'um' or 'like'.")
    if (session.avg_wpm or 0) > 170:
        recommendations.append("You're speaking too fast — aim for 130-160 WPM for clarity.")
    if not recommendations:
        recommendations.append("Great job! Keep practicing to aim for perfection.")

    return FullScorecardResponse(
        session_id=session.id,
        interview_type=session.interview_type,
        role=session.role,
        company_target=session.company_target,
        overall_grade=session.overall_grade,
        answers=answer_scorecards,
        communication_score=session.communication_score or 0.0,
        confidence_score=session.confidence_score or 0.0,
        technical_score=session.technical_score or 0.0,
        recommendations=recommendations,
    )
