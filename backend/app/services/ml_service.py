"""
Machine Learning service for flood-risk prediction.

Loads the pre-trained StackingRegressor model and exposes a predict()
method that transforms raw inputs through the feature-engineering
pipeline before running inference.
"""

import logging
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.models.schemas import PredictionRequest
from app.utils.feature_engineering import engineer_features

logger = logging.getLogger(__name__)


class MLService:
    """Encapsulates model loading and prediction logic."""

    def __init__(self, model_path: str) -> None:
        """
        Load the serialized model and extract expected feature names.

        Args:
            model_path: Absolute or relative path to the .pkl model file.
        """
        resolved_path = Path(model_path).resolve()
        logger.info("Loading ML model from: %s", resolved_path)

        self.model = joblib.load(resolved_path)

        # Attempt to read feature_names_in_ (set by scikit-learn pipelines)
        if hasattr(self.model, "feature_names_in_"):
            self.feature_names: list[str] = list(self.model.feature_names_in_)
            logger.info(
                "Model expects %d features: %s",
                len(self.feature_names),
                self.feature_names,
            )
        else:
            self.feature_names = []
            logger.warning(
                "Model does not expose feature_names_in_; "
                "will pass all engineered features as-is."
            )

        logger.info("ML model loaded successfully ✓")

    # ── Risk-level thresholds ─────────────────────────────────────────────
    _RISK_THRESHOLDS: list[tuple[float, str, str]] = [
        (0.3, "Low", "#10b981"),       # Emerald green
        (0.6, "Medium", "#f59e0b"),    # Amber
        (0.8, "High", "#ef4444"),      # Red
        (1.0, "Critical", "#dc2626"),  # Deep red
    ]

    def predict(self, request: PredictionRequest) -> tuple[float, str, str]:
        """
        Run a flood-risk prediction.

        1. Converts the request to a plain dict.
        2. Engineers derived features.
        3. Builds a DataFrame aligned to the model's expected columns.
        4. Runs model.predict() and clips the output to [0, 1].
        5. Maps the score to a risk level and color.

        Args:
            request: Validated prediction request.

        Returns:
            Tuple of (flood_risk_score, risk_level, risk_color).
        """
        # Step 1 — raw input dict
        raw_data: dict = request.model_dump()

        # Step 2 — add engineered features
        enriched_data: dict = engineer_features(raw_data)

        # Step 3 — build DataFrame with model's expected column order
        if self.feature_names:
            # Only include columns the model expects; fill unknown ones with 0
            row = {col: enriched_data.get(col, 0) for col in self.feature_names}
            df = pd.DataFrame([row], columns=self.feature_names)
        else:
            # Fallback: pass everything and let the model decide
            df = pd.DataFrame([enriched_data])

        # Ensure all values are numeric and NaN-free
        df = df.apply(pd.to_numeric, errors="coerce").fillna(0)

        logger.debug("Prediction input shape: %s", df.shape)
        logger.debug("Prediction input columns: %s", list(df.columns))

        # Step 4 — run inference
        raw_prediction: float = float(self.model.predict(df)[0])
        score: float = float(np.clip(raw_prediction, 0.0, 1.0))

        # Step 5 — map to risk level and color
        risk_level: str = "Critical"
        risk_color: str = "#dc2626"
        for threshold, level, color in self._RISK_THRESHOLDS:
            if score < threshold:
                risk_level = level
                risk_color = color
                break

        # Step 6 — calculate heuristic feature importance (XAI)
        feature_importance = self._compute_feature_importance(raw_data)

        logger.info(
            "Prediction: score=%.4f  level=%s  color=%s",
            score, risk_level, risk_color,
        )

        return score, risk_level, risk_color, feature_importance

    def _compute_feature_importance(self, raw_data: dict) -> list[dict]:
        """
        Calculates a heuristic feature importance based on the input values
        and pre-defined global importance weights.
        """
        # Global weights (approximate importance of each feature for flood risk)
        weights = {
            "rainfall_7d_mm": 0.35,
            "monthly_rainfall_mm": 0.20,
            "elevation_m": 0.25, # lower elevation = higher risk
            "distance_to_river_m": 0.15, # closer to river = higher risk
            "infrastructure_score": 0.05
        }
        
        # Max reasonable values for normalization
        max_values = {
            "rainfall_7d_mm": 500.0,
            "monthly_rainfall_mm": 2000.0,
            "elevation_m": 2500.0,
            "distance_to_river_m": 50000.0,
            "infrastructure_score": 10.0
        }

        # Human-readable labels
        labels = {
            "rainfall_7d_mm": "7-Day Rainfall",
            "monthly_rainfall_mm": "Monthly Rainfall",
            "elevation_m": "Low Elevation",
            "distance_to_river_m": "Proximity to River",
            "infrastructure_score": "Infrastructure Deficits"
        }

        importances = []
        for feature, weight in weights.items():
            val = float(raw_data.get(feature, 0.0))
            max_val = max_values[feature]
            
            # Inverse logic for elevation, distance to river, and infrastructure
            if feature in ["elevation_m", "distance_to_river_m", "infrastructure_score"]:
                # Lower value means higher contribution to risk
                normalized_val = max(0.0, 1.0 - (val / max_val))
            else:
                # Higher value means higher contribution to risk
                normalized_val = min(1.0, val / max_val)
                
            score = normalized_val * weight
            importances.append({
                "feature": labels[feature],
                "raw_score": score
            })

        # Normalize to sum to 100
        total_score = sum(item["raw_score"] for item in importances)
        if total_score == 0:
            total_score = 1.0 # prevent division by zero
            
        final_importances = []
        for item in importances:
            pct = int(round((item["raw_score"] / total_score) * 100))
            final_importances.append({
                "feature": item["feature"],
                "importance": pct
            })
            
        # Sort descending
        final_importances.sort(key=lambda x: x["importance"], reverse=True)
        return final_importances[:4] # Return top 4 features

    def simulate_feature(self, base_request: PredictionRequest, target_feature: str, min_value: float, max_value: float, steps: int) -> list[dict]:
        """
        Runs a simulation by varying a target feature across a range and returning risk scores.
        """
        from copy import deepcopy
        results = []
        
        # Calculate step size
        step_size = (max_value - min_value) / max(1, steps - 1)
        
        # Base dict representation of request
        base_dict = base_request.model_dump()
        
        for i in range(steps):
            current_value = min_value + (i * step_size)
            
            # Create a copy and update the target feature
            sim_dict = deepcopy(base_dict)
            sim_dict[target_feature] = current_value
            
            # Engineer features for this simulated request
            enriched_data = engineer_features(sim_dict)
            
            # Build DataFrame
            if self.feature_names:
                row = {col: enriched_data.get(col, 0) for col in self.feature_names}
                df = pd.DataFrame([row], columns=self.feature_names)
            else:
                df = pd.DataFrame([enriched_data])
                
            df = df.apply(pd.to_numeric, errors="coerce").fillna(0)
            
            # Predict
            raw_prediction: float = float(self.model.predict(df)[0])
            score: float = float(np.clip(raw_prediction, 0.0, 1.0))
            
            # Map risk level
            risk_level: str = "Critical"
            risk_color: str = "#dc2626"
            for threshold, level, color in self._RISK_THRESHOLDS:
                if score < threshold:
                    risk_level = level
                    risk_color = color
                    break
                    
            results.append({
                "value": round(current_value, 2),
                "risk_score": round(score, 4),
                "risk_level": risk_level,
                "risk_color": risk_color
            })
            
        return results
