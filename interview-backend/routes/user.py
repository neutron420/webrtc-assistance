import logging
from fastapi import APIRouter, HTTPException
from passlib.hash import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from models.database import get_db
from models.domain import UserProfile
from models.schema import UserCreateRequest, UserLoginRequest, UserProfileResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserProfileResponse)
async def register_user(req: UserCreateRequest, db: AsyncSession = Depends(get_db)):
    """
    Register a new user account.
    Hashes the password using bcrypt before storing.
    """
    # Check if email already exists
    result = await db.execute(select(UserProfile).where(UserProfile.email == req.email))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Hash the password
    hashed = bcrypt.hash(req.password)

    user = UserProfile(
        name=req.name,
        email=req.email,
        password_hash=hashed
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info(f"Registered new user: {user.email} (id={user.id})")
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        total_sessions=0,
        created_at=user.created_at
    )


@router.post("/login", response_model=UserProfileResponse)
async def login_user(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate a user by email and password.
    In production, this would return a JWT token instead.
    """
    result = await db.execute(select(UserProfile).where(UserProfile.email == req.email))
    user = result.scalars().first()

    if not user or not bcrypt.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Count sessions
    from models.domain import SessionLog
    session_result = await db.execute(
        select(SessionLog).where(SessionLog.user_id == user.id)
    )
    session_count = len(session_result.scalars().all())

    logger.info(f"User logged in: {user.email}")
    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        total_sessions=session_count,
        created_at=user.created_at
    )


@router.get("/profile/{user_id}", response_model=UserProfileResponse)
async def get_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch a user's profile by their ID."""
    result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    from models.domain import SessionLog
    session_result = await db.execute(
        select(SessionLog).where(SessionLog.user_id == user.id)
    )
    session_count = len(session_result.scalars().all())

    return UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        total_sessions=session_count,
        created_at=user.created_at
    )
