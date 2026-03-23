import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import audio, evaluation, session, user, progress, seed
from models.schema import HealthCheckResponse
from models.database import engine
from models.domain import Base

# ──────────────────────────────────────────────
# Configure logging for debugging
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Application lifespan (startup/shutdown events)
# ──────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events."""
    # Startup: create all database tables
    logger.info("🚀 Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Database ready!")
    
    yield  # App runs here
    
    # Shutdown: cleanup
    logger.info("🛑 Shutting down application...")
    await engine.dispose()


def create_app() -> FastAPI:
    """
    Application factory to create and configure the FastAPI app.
    Registers all routers, middleware, and lifecycle events.
    """
    app = FastAPI(
        title="AI Interview Prep Chatbot API",
        description=(
            "Production-ready FastAPI backend for an AI-powered interview preparation platform.\n\n"
            "**Features:**\n"
            "- 🎤 Audio transcription via Whisper\n"
            "- 🧠 GPT-4o STAR method evaluation\n"
            "- 👀 Eye contact tracking (MediaPipe)\n"
            "- 📊 Filler word detection & WPM analysis\n"
            "- 🏢 Company-specific interview prep (FAANG)\n"
            "- 📈 Progress tracking & improvement trends\n"
            "- 📚 Personalized study plan generation\n"
            "- 🔌 Real-time WebSocket feedback"
        ),
        version="2.0.0",
        lifespan=lifespan,
    )

    # ──────────────────────────────────────────────
    # CORS Middleware — allow frontend to connect
    # ──────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict to actual frontend domains
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ──────────────────────────────────────────────
    # Register all routers
    # ──────────────────────────────────────────────
    app.include_router(user.router,       prefix="/user",      tags=["👤 User Auth & Profile"])
    app.include_router(session.router,    prefix="/session",   tags=["🎯 Interview Sessions"])
    app.include_router(audio.router,      prefix="",           tags=["🎤 Audio Processing"])
    app.include_router(evaluation.router, prefix="/scoring",   tags=["📝 GPT Evaluations"])
    app.include_router(progress.router,   prefix="/progress",  tags=["📈 Progress Tracking"])
    app.include_router(seed.router,       prefix="/seed",      tags=["🌱 Demo Seeding"])

    # ──────────────────────────────────────────────
    # Health check endpoint
    # ──────────────────────────────────────────────
    @app.get("/", response_model=HealthCheckResponse, tags=["❤️ Health"])
    async def root():
        """Simple health check to verify the server is running."""
        logger.info("Health check endpoint called")
        return HealthCheckResponse(
            status="ok",
            message="AI Interview Backend v2.0 is up and running!"
        )

    return app


# Create the app instance
app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
