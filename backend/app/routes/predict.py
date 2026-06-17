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
    request: Request,
    payload: PredictionRequest,
    background_tasks: BackgroundTasks,
    ml_service=Depends(get_ml_service),
    db_service=Depends(get_db_service),
) -> PredictionResponse:
    """Run inference and return the risk assessment."""

    # ── Extract user_id from JWT (optional — prediction still works unauthenticated) ──
    user_id = None
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            auth_service = request.app.state.auth_service
            token_data = auth_service.verify_token(token)
            user = await auth_service.get_user_by_email(token_data.email)
            if user:
                user_id = user["id"]
    except Exception:
        pass  # Non-critical — prediction proceeds without user tracking

    # ── Run the ML model ──────────────────────────────────────────────────
    score, risk_level, risk_color, feature_importance = ml_service.predict(payload)

    # ── Build response ────────────────────────────────────────────────────
    prediction_id: str = str(uuid.uuid4())
    timestamp: str = datetime.now(timezone.utc).isoformat()

    response = PredictionResponse(
        prediction_id=prediction_id,
        flood_risk_score=round(score, 4),
        risk_level=risk_level,
        timestamp=timestamp,
        risk_color=risk_color,
        feature_importance=feature_importance,
        input_data=payload.model_dump(),
    )

    # ── Async log to MongoDB (non-blocking) ───────────────────────────────
    log_entry = {
        "prediction_id": prediction_id,
        "flood_risk_score": round(score, 4),
        "risk_level": risk_level,
        "risk_color": risk_color,
        "timestamp": timestamp,
        "input_data": payload.model_dump(),
        "user_id": user_id,
    }
    background_tasks.add_task(db_service.log_prediction, log_entry)

    return response


@router.post(
    "/simulate",
    response_model=dict,
    summary="Simulate what-if scenario",
)
async def simulate_scenario(
    payload: dict,
    ml_service=Depends(get_ml_service),
):
    """Run a scenario simulation varying a specific feature."""
    from app.models.schemas import SimulationRequest, SimulationResponse
    
    req = SimulationRequest(**payload)
    
    data_points = ml_service.simulate_feature(
        base_request=req.base_request,
        target_feature=req.target_feature,
        min_value=req.min_value,
        max_value=req.max_value,
        steps=req.steps
    )
    
    return SimulationResponse(
        target_feature=req.target_feature,
        data_points=data_points
    ).model_dump()
