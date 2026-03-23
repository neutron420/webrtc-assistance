import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from models.database import get_db
from models.domain import SessionLog, Scorecard
from services.llm_service import LLMService

logger = logging.getLogger(__name__)
router = APIRouter()
llm_service = LLMService()

@router.post("/evaluate/{session_id}")
async def evaluate_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """
    Triggers GPT-4o evaluation on a past session log based on the transcript,
    generates a Scorecard, and saves it to the database.
    """
    # Fetch session (Placeholder for real DB query)
    logger.info(f"Fetching session {session_id} for evaluation")
    
    # Normally we query DB here, e.g.:
    # session = await db.execute(select(SessionLog).where(SessionLog.id == session_id))
    # session_log = session.scalars().first()
    
    # Dummy data
    dummy_question = "Tell me about a time you optimized a slow database query."
    dummy_transcript = "I noticed the database was slow. I found out it was doing a full table scan. So I added an index."
    
    # 1. Call LLM Service
    evaluation = await llm_service.generate_scorecard(dummy_question, dummy_transcript)
    
    # 2. Save scorecard to DB (Placeholder)
    # new_scorecard = Scorecard(
    #     session_id=session_id,
    #     star_relevance=evaluation.relevance,
    #     star_completeness=evaluation.star_structure,
    #     technical_grade=evaluation.technical_grade,
    #     full_feedback=evaluation.full_feedback
    # )
    # db.add(new_scorecard)
    # await db.commit()
    
    return {
        "status": "success",
        "scorecard": evaluation
    }
