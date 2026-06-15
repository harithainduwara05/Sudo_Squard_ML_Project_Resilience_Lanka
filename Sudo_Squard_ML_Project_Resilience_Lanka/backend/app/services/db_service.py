"""
Database service for asynchronous MongoDB operations.

Handles prediction logging, user feedback storage, and analytics
aggregation. All methods are resilient to connection failures —
they log warnings instead of crashing the application.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)


class DBService:
    """Async MongoDB wrapper for Resilience-Lanka data persistence."""

    def __init__(self, uri: str, db_name: str) -> None:
        """
        Initialize the async MongoDB client.

        Args:
            uri:     MongoDB connection string.
            db_name: Name of the target database.
        """
        self.client: AsyncIOMotorClient = AsyncIOMotorClient(
            uri,
            serverSelectionTimeoutMS=5000,  # fail fast on unreachable server
        )
        self.db = self.client[db_name]
        logger.info("MongoDB client initialized → database: %s", db_name)

    # ── Prediction Logging ────────────────────────────────────────────────

    async def log_prediction(self, prediction_data: dict) -> None:
        """
        Insert a prediction record into the `prediction_logs` collection.

        Args:
            prediction_data: Dictionary containing prediction details.
        """
        try:
            prediction_data["created_at"] = datetime.now(timezone.utc).isoformat()
            result = await self.db.prediction_logs.insert_one(prediction_data)
            logger.info("Prediction logged → _id: %s", result.inserted_id)
        except Exception as exc:
            logger.warning(
                "Failed to log prediction to MongoDB: %s", exc, exc_info=True
            )

    # ── User Feedback ─────────────────────────────────────────────────────

    async def log_feedback(self, feedback_data: dict) -> None:
        """
        Insert a feedback record into the `user_feedback` collection.

        Args:
            feedback_data: Dictionary containing feedback details.
        """
        try:
            feedback_data["created_at"] = datetime.now(timezone.utc).isoformat()
            result = await self.db.user_feedback.insert_one(feedback_data)
            logger.info("Feedback logged → _id: %s", result.inserted_id)
        except Exception as exc:
            logger.warning(
                "Failed to log feedback to MongoDB: %s", exc, exc_info=True
            )

    # ── Analytics ─────────────────────────────────────────────────────────

    async def get_analytics(self) -> dict[str, Any]:
        """
        Aggregate prediction statistics.

        Returns:
            Dictionary with total_predictions, high_risk_count, and
            avg_risk_score. Returns zeroed defaults on failure.
        """
        try:
            collection = self.db.prediction_logs

            total_predictions: int = await collection.count_documents({})

            high_risk_count: int = await collection.count_documents(
                {"flood_risk_score": {"$gt": 0.6}}
            )

            # Compute average risk score via aggregation pipeline
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "avg_score": {"$avg": "$flood_risk_score"},
                    }
                }
            ]
            cursor = collection.aggregate(pipeline)
            agg_result = await cursor.to_list(length=1)
            avg_risk_score: float = (
                round(agg_result[0]["avg_score"], 4)
                if agg_result and agg_result[0].get("avg_score") is not None
                else 0.0
            )

            return {
                "total_predictions": total_predictions,
                "high_risk_count": high_risk_count,
                "avg_risk_score": avg_risk_score,
            }

        except Exception as exc:
            logger.warning(
                "Failed to fetch analytics from MongoDB: %s", exc, exc_info=True
            )
            return {
                "total_predictions": 0,
                "high_risk_count": 0,
                "avg_risk_score": 0.0,
            }

    async def get_recent_predictions(self, limit: int = 10) -> list[dict]:
        """
        Retrieve the most recent prediction records.

        Args:
            limit: Maximum number of records to return (default 10).

        Returns:
            List of prediction dicts, newest first.
        """
        try:
            cursor = (
                self.db.prediction_logs
                .find({}, {"_id": 0})           # exclude Mongo ObjectId
                .sort("created_at", -1)          # newest first
                .limit(limit)
            )
            results: list[dict] = await cursor.to_list(length=limit)
            return results

        except Exception as exc:
            logger.warning(
                "Failed to fetch recent predictions from MongoDB: %s",
                exc,
                exc_info=True,
            )
            return []

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        """Gracefully close the MongoDB connection."""
        try:
            self.client.close()
            logger.info("MongoDB connection closed ✓")
        except Exception as exc:
            logger.warning("Error closing MongoDB connection: %s", exc)
