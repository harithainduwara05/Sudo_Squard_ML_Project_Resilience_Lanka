"""
Pydantic schemas for request/response validation.

Defines all data models used across the Resilience-Lanka API endpoints
including prediction requests, responses, feedback, and analytics.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any


# ═══════════════════════════════════════════════════════════════════════════
# Prediction
# ═══════════════════════════════════════════════════════════════════════════

class PredictionRequest(BaseModel):
    """
    Input payload for flood risk prediction.

    Numeric features accept real-world values; categorical features accept
    pre-encoded integer codes (the frontend provides dropdowns mapping
    human-readable labels to these codes).
    """

    # ── Geographic coordinates ────────────────────────────────────────────
    latitude: float = Field(
        default=7.0, ge=5.9, le=9.9,
        description="Latitude of the location (Sri Lanka range: 5.9–9.9)",
    )
    longitude: float = Field(
        default=80.0, ge=79.5, le=81.9,
        description="Longitude of the location (Sri Lanka range: 79.5–81.9)",
    )

    # ── Continuous environmental features ─────────────────────────────────
    rainfall_7d_mm: float = Field(
        default=50.0, ge=0.0, le=2000.0,
        description="Cumulative rainfall in the last 7 days (mm)",
    )
    monthly_rainfall_mm: float = Field(
        default=200.0, ge=0.0, le=5000.0,
        description="Total rainfall for the current month (mm)",
    )
    elevation_m: float = Field(
        default=100.0, ge=0.0, le=2500.0,
        description="Ground elevation above sea level (meters)",
    )
    distance_to_river_m: float = Field(
        default=5000.0, ge=0.0, le=50000.0,
        description="Distance to the nearest river (meters)",
    )
    nearest_hospital_km: float = Field(
        default=10.0, ge=0.0, le=100.0,
        description="Distance to the nearest hospital (km)",
    )
    nearest_evac_km: float = Field(
        default=15.0, ge=0.0, le=100.0,
        description="Distance to the nearest evacuation center (km)",
    )
    population_density_per_km2: float = Field(
        default=500.0, ge=0.0, le=25000.0,
        description="Population density (people per km²)",
    )
    infrastructure_score: float = Field(
        default=5.0, ge=0.0, le=10.0,
        description="Infrastructure quality score (0 = worst, 10 = best)",
    )

    # ── Categorical features (label-encoded integers) ─────────────────────
    district: int = Field(
        default=0, ge=0, le=25,
        description="District code (label-encoded, 0–25)",
    )
    landcover: int = Field(
        default=0, ge=0, le=10,
        description="Land cover type code (label-encoded, 0–10)",
    )
    soil_type: int = Field(
        default=0, ge=0, le=10,
        description="Soil type code (label-encoded, 0–10)",
    )
    water_supply: int = Field(
        default=0, ge=0, le=5,
        description="Water supply quality code (label-encoded, 0–5)",
    )
    electricity: int = Field(
        default=0, ge=0, le=5,
        description="Electricity availability code (label-encoded, 0–5)",
    )
    road_quality: int = Field(
        default=0, ge=0, le=5,
        description="Road quality code (label-encoded, 0–5)",
    )
    urban_rural: int = Field(
        default=0, ge=0, le=2,
        description="Urban/Rural classification (0=Urban, 1=Semi-Urban, 2=Rural)",
    )
    water_presence_flag: int = Field(
        default=0, ge=0, le=1,
        description="Water presence flag (0=No, 1=Yes)",
    )
    flood_occurrence_current_event: int = Field(
        default=0, ge=0, le=1,
        description="Current flood event occurring (0=No, 1=Yes)",
    )
    is_good_to_live: int = Field(
        default=1, ge=0, le=1,
        description="Area livability flag (0=No, 1=Yes)",
    )
    geo_cluster: int = Field(
        default=0, ge=0, le=34,
        description="Geographic cluster ID from KMeans (0–34)",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "latitude": 6.9271,
                    "longitude": 79.8612,
                    "rainfall_7d_mm": 120.0,
                    "monthly_rainfall_mm": 350.0,
                    "elevation_m": 15.0,
                    "distance_to_river_m": 800.0,
                    "nearest_hospital_km": 3.5,
                    "nearest_evac_km": 5.0,
                    "population_density_per_km2": 3400.0,
                    "infrastructure_score": 7.0,
                    "district": 3,
                    "landcover": 2,
                    "soil_type": 1,
                    "water_supply": 3,
                    "electricity": 4,
                    "road_quality": 3,
                    "urban_rural": 0,
                    "water_presence_flag": 1,
                    "flood_occurrence_current_event": 0,
                    "is_good_to_live": 1,
                    "geo_cluster": 12,
                }
            ]
        }
    }


class PredictionResponse(BaseModel):
    """Response payload returned after a successful flood-risk prediction."""

    prediction_id: str = Field(
        ..., description="Unique identifier for this prediction"
    )
    flood_risk_score: float = Field(
        ..., ge=0.0, le=1.0,
        description="Predicted flood risk score (0–1)",
    )
    risk_level: str = Field(
        ..., description="Categorical risk level: Low / Medium / High / Critical"
    )
    timestamp: str = Field(
        ..., description="ISO-8601 timestamp of the prediction"
    )
    risk_color: str = Field(
        ..., description="Hex color code representing the risk level"
    )
    feature_importance: Optional[List[dict]] = Field(
        default=None, description="List of top contributing features (e.g. [{'feature': 'Rainfall', 'importance': 45}])"
    )
    input_data: Optional[dict] = Field(
        default=None, description="The original request payload used for this prediction"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Simulation (What-If Scenarios)
# ═══════════════════════════════════════════════════════════════════════════

class SimulationRequest(BaseModel):
    """Payload for running a what-if scenario simulation."""
    base_request: PredictionRequest = Field(
        ..., description="The original prediction request to act as the baseline."
    )
    target_feature: str = Field(
        ..., description="The name of the feature to vary (e.g., 'rainfall_7d_mm')"
    )
    min_value: float = Field(..., description="Minimum value for the simulation range")
    max_value: float = Field(..., description="Maximum value for the simulation range")
    steps: int = Field(default=10, ge=2, le=50, description="Number of data points to generate")


class SimulationDataPoint(BaseModel):
    value: float
    risk_score: float
    risk_level: str
    risk_color: str


class SimulationResponse(BaseModel):
    """Response payload for a scenario simulation."""
    target_feature: str
    data_points: List[SimulationDataPoint]


# ═══════════════════════════════════════════════════════════════════════════
# Feedback
# ═══════════════════════════════════════════════════════════════════════════

class FeedbackRequest(BaseModel):
    """User feedback on a previous prediction."""

    prediction_id: str = Field(
        ..., description="ID of the prediction being reviewed"
    )
    is_accurate: bool = Field(
        ..., description="Whether the user considers the prediction accurate"
    )
    comment: Optional[str] = Field(
        default=None, max_length=1000,
        description="Optional free-text comment",
    )


class FeedbackResponse(BaseModel):
    """Acknowledgement returned after feedback submission."""

    message: str = Field(..., description="Confirmation message")
    feedback_id: str = Field(
        ..., description="Unique identifier for this feedback entry"
    )


# ═══════════════════════════════════════════════════════════════════════════
# Analytics
# ═══════════════════════════════════════════════════════════════════════════

class AnalyticsResponse(BaseModel):
    """Aggregated analytics data for the dashboard."""

    total_predictions: int = Field(
        ..., description="Total number of predictions made"
    )
    high_risk_count: int = Field(
        ..., description="Number of predictions with risk score > 0.6"
    )
    avg_risk_score: float = Field(
        ..., description="Average flood risk score across all predictions"
    )
    recent_predictions: List[Any] = Field(
        default_factory=list,
        description="List of the most recent prediction records",
    )
