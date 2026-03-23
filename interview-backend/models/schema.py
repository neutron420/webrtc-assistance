from pydantic import BaseModel
from typing import Optional

class TranscriptionResponse(BaseModel):
    """
    Response model for audio transcription.
    """
    text: str
    filename: str
    duration: Optional[float] = None

class HealthCheckResponse(BaseModel):
    """
    Response model for health check endpoint.
    """
    status: str
    message: str
