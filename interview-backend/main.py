import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import audio
from models.schema import HealthCheckResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def create_app() -> FastAPI:
    """
    Application factory to create and configure the FastAPI app.
    """
    app = FastAPI(
        title="AI Interview Prep Chatbot API",
        description="FastAPI backend for real-time interview preparation and feedback",
        version="1.0.0"
    )

    # Configure CORS - allow frontend to connect
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # In production, restrict to actual frontend domains
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(audio.router, tags=["Audio Processing"])

    @app.get("/", response_model=HealthCheckResponse, tags=["Health"])
    async def root():
        """
        Simple health check endpoint to verify server is running.
        """
        logger.info("Health check endpoint called")
        return HealthCheckResponse(
            status="ok",
            message="AI Interview Backend is up and running!"
        )

    return app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    # Make sure 'main:app' matches filename:app_variable
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
