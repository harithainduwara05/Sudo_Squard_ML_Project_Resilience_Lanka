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

        logger.info(
            "Prediction: score=%.4f  level=%s  color=%s",
            score, risk_level, risk_color,
        )

        return score, risk_level, risk_color
