"""
Configuration settings for the Resilience-Lanka API.

Uses pydantic-settings to load environment variables from a .env file
with sensible defaults for local development.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # ── ML Model ──────────────────────────────────────────────────────────
    MODEL_PATH: str = "../flood_risk_model.pkl"

    # ── MongoDB ───────────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "resilience_lanka"

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["*"]

    # ── JWT Authentication ────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "resilience-lanka-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440  # 24 hours

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# Singleton settings instance
settings = Settings()
