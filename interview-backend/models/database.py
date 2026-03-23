import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

load_dotenv()

# We'll use async SQLite for local testing right now, 
# but it's identical syntax for PostgreSQL ("postgresql+asyncpg://user:password@localhost/dbname")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./interview_prep.db")

engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session
