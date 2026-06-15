"""
Analytics route — GET /api/analytics

Returns aggregated prediction statistics and recent prediction
records for the dashboard overview panel.
"""

from fastapi import APIRouter, Depends, Request

from app.models.schemas import AnalyticsResponse

router = APIRouter(prefix="/api", tags=["Analytics"])


def get_db_service(request: Request):
    """Dependency: retrieve DBService from app state."""
    return request.app.state.db_service


@router.get(
    "/analytics",
    response_model=AnalyticsResponse,
    summary="Get analytics overview",
    description=(
        "Retrieve aggregated prediction statistics including total count, "
        "high-risk count, average score, and recent prediction records."
    ),
)
async def get_analytics(
    db_service=Depends(get_db_service),
) -> AnalyticsResponse:
    """Aggregate and return dashboard analytics."""

    # Fetch stats and recent predictions concurrently-safe (sequential here
    # since both hit the same DB and ordering doesn't matter for correctness)
    analytics: dict = await db_service.get_analytics()
    recent: list = await db_service.get_recent_predictions(limit=10)

    return AnalyticsResponse(
        total_predictions=analytics["total_predictions"],
        high_risk_count=analytics["high_risk_count"],
        avg_risk_score=analytics["avg_risk_score"],
        recent_predictions=recent,
    )
