"""
Feature engineering utilities.

Replicates the derived features that were computed during model training
so that API inputs are transformed identically before prediction.
"""


def engineer_features(data: dict) -> dict:
    """
    Compute engineered features from raw input values.

    Takes a dictionary of raw feature values (from PredictionRequest)
    and returns a new dictionary containing both the original features
    and all derived features expected by the trained model.

    Args:
        data: Dictionary of raw input features.

    Returns:
        Merged dictionary with original + engineered features.
    """
    # Extract values used in multiple computations
    rainfall_7d: float = data.get("rainfall_7d_mm", 0.0)
    monthly_rainfall: float = data.get("monthly_rainfall_mm", 0.0)
    elevation: float = data.get("elevation_m", 0.0)
    distance_to_river: float = data.get("distance_to_river_m", 0.0)
    nearest_hospital: float = data.get("nearest_hospital_km", 0.0)
    nearest_evac: float = data.get("nearest_evac_km", 0.0)
    pop_density: float = data.get("population_density_per_km2", 0.0)
    infra_score: float = data.get("infrastructure_score", 0.0)

    # ── Derived features (matching training pipeline) ─────────────────────

    # No missing values in API input since all fields have defaults
    missing_count: int = 0

    # Rainfall intensity relative to monthly total
    rainfall_intensity_ratio: float = rainfall_7d / (monthly_rainfall + 1)

    # Combined accessibility measure
    accessibility_score: float = nearest_hospital + nearest_evac

    # Population vulnerability considering infrastructure quality
    population_vulnerability: float = pop_density / (infra_score + 1)

    # Elevation relative to river distance
    elevation_river_ratio: float = elevation / (distance_to_river + 1)

    # Rainfall pressure relative to river proximity
    rain_vs_river: float = rainfall_7d / (distance_to_river + 1)

    # Compound extreme-risk indicator
    extreme_risk_index: float = rain_vs_river * (1 / (elevation + 1))

    # ── Merge original and engineered features ────────────────────────────
    enriched = {**data}
    enriched.update(
        {
            "missing_count": missing_count,
            "rainfall_intensity_ratio": rainfall_intensity_ratio,
            "accessibility_score": accessibility_score,
            "population_vulnerability": population_vulnerability,
            "elevation_river_ratio": elevation_river_ratio,
            "rain_vs_river": rain_vs_river,
            "extreme_risk_index": extreme_risk_index,
        }
    )

    return enriched
