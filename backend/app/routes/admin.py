"""
Administrator routes for user control and operational dashboard data.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models.admin_schemas import (
    AdminOverviewResponse,
    AdminRoleUpdate,
    AdminStatusUpdate,
    AdminUsersResponse,
)
from app.models.auth_schemas import UserResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def get_auth_service(request: Request):
    """Dependency: retrieve AuthService from app state."""
    return request.app.state.auth_service


def get_db_service(request: Request):
    """Dependency: retrieve DBService from app state."""
    return request.app.state.db_service


async def require_admin(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Allow only active admin users to access admin routes."""
    if current_user.get("role") != "admin" or current_user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


@router.get("/overview", response_model=AdminOverviewResponse)
async def get_admin_overview(
    _admin: dict = Depends(require_admin),
    auth_service=Depends(get_auth_service),
    db_service=Depends(get_db_service),
) -> AdminOverviewResponse:
    """Return usage, user, and feedback-based accuracy metrics."""
    user_counts = await auth_service.get_user_counts()
    analytics = await db_service.get_analytics()
    feedback = await db_service.get_feedback_accuracy()

    return AdminOverviewResponse(
        total_users=user_counts["total_users"],
        active_users=user_counts["active_users"],
        admin_users=user_counts["admin_users"],
        total_predictions=analytics["total_predictions"],
        high_risk_count=analytics["high_risk_count"],
        avg_risk_score=analytics["avg_risk_score"],
        feedback=feedback,
    )


@router.get("/users", response_model=AdminUsersResponse)
async def list_admin_users(
    search: str | None = None,
    _admin: dict = Depends(require_admin),
    auth_service=Depends(get_auth_service),
) -> AdminUsersResponse:
    """Return registered users for admin management."""
    users, total = await auth_service.list_users(search=search)
    return AdminUsersResponse(
        users=[UserResponse(**user) for user in users],
        total=total,
        search=search,
    )


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_admin_user_role(
    user_id: str,
    body: AdminRoleUpdate,
    admin: dict = Depends(require_admin),
    auth_service=Depends(get_auth_service),
) -> UserResponse:
    """Promote or demote a user's role."""
    if user_id == admin["id"] and body.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role",
        )

    updated = await auth_service.update_user_role(user_id=user_id, role=body.role)
    return UserResponse(**updated)


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def update_admin_user_status(
    user_id: str,
    body: AdminStatusUpdate,
    admin: dict = Depends(require_admin),
    auth_service=Depends(get_auth_service),
) -> UserResponse:
    """Activate or deactivate a user account."""
    if user_id == admin["id"] and body.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    updated = await auth_service.update_user_status(
        user_id=user_id,
        is_active=body.is_active,
    )
    return UserResponse(**updated)
