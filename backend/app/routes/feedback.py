"""
Feedback route — POST /api/feedback

Allows users to submit accuracy feedback on previous predictions,
stored in MongoDB for model-improvement workflows.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from app.models.schemas import FeedbackRequest, FeedbackResponse

router = APIRouter(prefix="/api", tags=["Feedback"])


def get_db_service(request: Request):
    """Dependency: retrieve DBService from app state."""
    return request.app.state.db_service


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    summary="Submit prediction feedback",
    description=(
        "Provide feedback on a previous prediction indicating whether "
        "the risk assessment was accurate, with an optional comment."
    ),
)
async def submit_feedback(
    payload: FeedbackRequest,
    db_service=Depends(get_db_service),
) -> FeedbackResponse:
    """Record user feedback for a given prediction."""

    feedback_id: str = str(uuid.uuid4())
    timestamp: str = datetime.now(timezone.utc).isoformat()

    feedback_entry = {
        "feedback_id": feedback_id,
        "prediction_id": payload.prediction_id,
        "is_accurate": payload.is_accurate,
        "comment": payload.comment,
        "timestamp": timestamp,
    }

    await db_service.log_feedback(feedback_entry)

    return FeedbackResponse(
        message="Feedback recorded successfully. Thank you!",
        feedback_id=feedback_id,
    )
