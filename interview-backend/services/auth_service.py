import os
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.database import get_db
from models.domain import UserProfile

logger = logging.getLogger(__name__)

# ── CONFIGURATION (In Production, move these to .env) ──
SECRET_KEY = os.getenv("SECRET_KEY", "Sandbox_AI_Secure_Key_2026_XLR")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 Hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="user/login")


class AuthService:
    """Handles logic for JWT token generation and authentication dependencies."""

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Generates a secure JWT token for a user session."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt


    async def get_current_user(self, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> UserProfile:
        """Dependency that validates the JWT token and returns the current user."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: int = int(payload.get("sub"))
            if user_id is None:
                raise credentials_exception
        except (JWTError, ValueError):
            raise credentials_exception

        result = await db.execute(select(UserProfile).where(UserProfile.id == user_id))
        user = result.scalars().first()
        if user is None:
            raise credentials_exception
            
        return user


# Singleton instance
auth_service = AuthService()
