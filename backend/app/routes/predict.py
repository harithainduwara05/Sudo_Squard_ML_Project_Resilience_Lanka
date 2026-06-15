"""
Prediction route — POST /api/predict

Accepts flood-risk prediction requests, runs the ML model,
and asynchronously logs results to MongoDB.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from app.models.schemas import PredictionRequest, PredictionResponse

router = APIRouter(prefix="/api", tags=["Prediction"])


def get_ml_service(request: Request):
    """Dependency: retrieve MLService from app state."""
    return request.app.state.ml_service


def get_db_service(request: Request):
    """Dependency: retrieve DBService from app state."""
    return request.app.state.db_service


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict flood risk",
    description=(
        "Submit location and environmental parameters to receive a "
        "flood-risk score (0–1), categorical risk level, and color code."
    ),
)
async def predict_flood_risk(
    payload: PredictionRequest,
    background_tasks: BackgroundTasks,
    ml_service=Depends(get_ml_service),
    db_service=Depends(get_db_service),
) -> PredictionResponse:
    """Run inference and return the risk assessment."""

    # ── Run the ML model ──────────────────────────────────────────────────
    score, risk_level, risk_color = ml_service.predict(payload)

    # ── Build response ────────────────────────────────────────────────────
    prediction_id: str = str(uuid.uuid4())
    timestamp: str = datetime.now(timezone.utc).isoformat()

    response = PredictionResponse(
        prediction_id=prediction_id,
        flood_risk_score=round(score, 4),
        risk_level=risk_level,
        timestamp=timestamp,
        risk_color=risk_color,
    )

    # ── Async log to MongoDB (non-blocking) ───────────────────────────────
    log_entry = {
        "prediction_id": prediction_id,
        "flood_risk_score": round(score, 4),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "timestamp": timestamp,
        "input_data": payload.model_dump(),
    }
    background_tasks.add_task(db_service.log_prediction, log_entry)

    return response
