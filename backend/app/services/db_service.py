"""
Database service for asynchronous MongoDB operations.

Handles prediction logging, user feedback storage, and analytics
aggregation. All methods are resilient to connection failures —
they log warnings instead of crashing the application.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorClient

logger = logging.getLogger(__name__)

DISTRICT_NAMES = [
    "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale",
    "Nuwara Eliya", "Galle", "Matara", "Hambantota", "Jaffna",
    "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya", "Trincomalee",
    "Batticaloa", "Ampara", "Puttalam", "Kurunegala", "Anuradhapura",
    "Polonnaruwa", "Badulla", "Moneragala", "Ratnapura", "Kegalle",
]


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

    async def get_feedback_accuracy(self, limit: int = 8) -> dict[str, Any]:
        """
        Summarize feedback as an operational accuracy signal.

        This reflects user-confirmed feedback, not a full scientific validation
        set. Admins can use it to spot model-quality problems early.
        """
        try:
            collection = self.db.user_feedback
            total_feedback = await collection.count_documents({})
            accurate_feedback = await collection.count_documents({"is_accurate": True})
            inaccurate_feedback = await collection.count_documents(
                {"is_accurate": False}
            )
            feedback_accuracy = (
                round((accurate_feedback / total_feedback) * 100, 1)
                if total_feedback
                else 0.0
            )

            cursor = (
                collection
                .find({"is_accurate": False}, {"_id": 0})
                .sort("created_at", -1)
                .limit(limit)
            )
            recent_inaccurate_feedback = await cursor.to_list(length=limit)

            return {
                "total_feedback": total_feedback,
                "accurate_feedback": accurate_feedback,
                "inaccurate_feedback": inaccurate_feedback,
                "feedback_accuracy": feedback_accuracy,
                "recent_inaccurate_feedback": recent_inaccurate_feedback,
            }

        except Exception as exc:
            logger.warning(
                "Failed to fetch feedback accuracy from MongoDB: %s",
                exc,
                exc_info=True,
            )
            return {
                "total_feedback": 0,
                "accurate_feedback": 0,
                "inaccurate_feedback": 0,
                "feedback_accuracy": 0.0,
                "recent_inaccurate_feedback": [],
            }

    async def get_admin_risk_insights(self, limit: int = 500) -> dict[str, Any]:
        """
        Build compact risk summaries for admin charts.

        The 24-hour watchlist is based on recent prediction-log patterns. It is
        not a weather forecast; it highlights districts likely to need attention
        if the current risk pattern continues.
        """
        try:
            cursor = (
                self.db.prediction_logs
                .find({}, {"_id": 0})
                .sort("created_at", -1)
                .limit(limit)
            )
            predictions = await cursor.to_list(length=limit)

            distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}
            districts: dict[str, dict[str, Any]] = {}
            now = datetime.now(timezone.utc)
            recent_cutoff = now - timedelta(hours=24)

            for item in predictions:
                score = float(item.get("flood_risk_score") or 0)
                bucket = self._risk_bucket(score)
                distribution[bucket] += 1

                district = self._district_name(item)
                stats = districts.setdefault(
                    district,
                    {
                        "district": district,
                        "count": 0,
                        "high_risk_count": 0,
                        "score_sum": 0.0,
                        "max_score": 0.0,
                        "recent_score_sum": 0.0,
                        "recent_count": 0,
                    },
                )
                stats["count"] += 1
                stats["score_sum"] += score
                stats["max_score"] = max(stats["max_score"], score)
                if score >= 0.6:
                    stats["high_risk_count"] += 1

                created_at = self._parse_timestamp(
                    item.get("created_at") or item.get("timestamp")
                )
                if created_at and created_at >= recent_cutoff:
                    stats["recent_score_sum"] += score
                    stats["recent_count"] += 1

            high_risk_areas = []
            watchlist = []
            for stats in districts.values():
                avg_score = stats["score_sum"] / stats["count"] if stats["count"] else 0.0
                recent_avg = (
                    stats["recent_score_sum"] / stats["recent_count"]
                    if stats["recent_count"]
                    else avg_score
                )
                projected_score = min(
                    1.0,
                    round((recent_avg * 0.7) + (stats["max_score"] * 0.3), 3),
                )

                if stats["high_risk_count"] > 0:
                    high_risk_areas.append(
                        {
                            "district": stats["district"],
                            "count": stats["count"],
                            "high_risk_count": stats["high_risk_count"],
                            "avg_score": round(avg_score, 3),
                            "max_score": round(stats["max_score"], 3),
                        }
                    )

                if projected_score >= 0.55:
                    watchlist.append(
                        {
                            "district": stats["district"],
                            "projected_score": projected_score,
                            "recent_predictions": stats["recent_count"],
                            "signal": self._risk_bucket(projected_score).title(),
                        }
                    )

            high_risk_areas.sort(
                key=lambda area: (area["max_score"], area["high_risk_count"]),
                reverse=True,
            )
            watchlist.sort(key=lambda area: area["projected_score"], reverse=True)

            return {
                "high_risk_areas": high_risk_areas[:6],
                "risk_watchlist_24h": watchlist[:6],
                "risk_distribution": distribution,
            }

        except Exception as exc:
            logger.warning(
                "Failed to build admin risk insights from MongoDB: %s",
                exc,
                exc_info=True,
            )
            return {
                "high_risk_areas": [],
                "risk_watchlist_24h": [],
                "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0},
            }

    def _district_name(self, prediction: dict) -> str:
        """Resolve the district code stored inside a prediction log."""
        district_code = prediction.get("input_data", {}).get("district")
        if isinstance(district_code, int) and 0 <= district_code < len(DISTRICT_NAMES):
            return DISTRICT_NAMES[district_code]
        return "Unknown"

    def _risk_bucket(self, score: float) -> str:
        """Map a risk score to a display bucket."""
        if score >= 0.8:
            return "critical"
        if score >= 0.6:
            return "high"
        if score >= 0.3:
            return "medium"
        return "low"

    def _parse_timestamp(self, value: Any) -> datetime | None:
        """Parse stored ISO timestamps safely."""
        if not isinstance(value, str):
            return None
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None

    # ── Lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        """Gracefully close the MongoDB connection."""
        try:
            self.client.close()
            logger.info("MongoDB connection closed ✓")
        except Exception as exc:
            logger.warning("Error closing MongoDB connection: %s", exc)
