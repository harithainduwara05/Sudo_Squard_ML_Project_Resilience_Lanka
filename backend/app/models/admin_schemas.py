"""
Pydantic schemas for administrator-only API responses and updates.
"""

from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.auth_schemas import UserResponse


class AdminRoleUpdate(BaseModel):
    """Payload for changing a user's role."""

    role: str = Field(
        ...,
        pattern="^(officer|admin|researcher)$",
        description="New role for the selected user.",
    )


class AdminStatusUpdate(BaseModel):
    """Payload for activating or deactivating a user account."""

    is_active: bool = Field(..., description="Whether the user can log in.")


class FeedbackAccuracySummary(BaseModel):
    """Accuracy summary derived from submitted feedback."""

    total_feedback: int = 0
    accurate_feedback: int = 0
    inaccurate_feedback: int = 0
    feedback_accuracy: float = 0.0
    recent_inaccurate_feedback: list[dict[str, Any]] = Field(default_factory=list)


class AdminOverviewResponse(BaseModel):
    """Aggregated data for the admin dashboard."""

    total_users: int = 0
    active_users: int = 0
    admin_users: int = 0
    total_predictions: int = 0
    high_risk_count: int = 0
    avg_risk_score: float = 0.0
    feedback: FeedbackAccuracySummary = Field(default_factory=FeedbackAccuracySummary)


class AdminUsersResponse(BaseModel):
    """Paginated user list for administrators."""

    users: list[UserResponse]
    total: int
    search: Optional[str] = None
