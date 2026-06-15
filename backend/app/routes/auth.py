"""
Authentication routes — register, login, and current-user retrieval.
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.models.auth_schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Dependency ────────────────────────────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    """
    Extract and validate the JWT from the Authorization header.

    Returns the authenticated user dict.

    Raises:
        HTTPException 401 if the token is missing, malformed, or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header.split(" ", 1)[1]
    auth_service = request.app.state.auth_service
    token_data = auth_service.verify_token(token)

    user = await auth_service.get_user_by_email(token_data.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated",
        )
    return user


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(request: Request, body: RegisterRequest):
    """Register a new user and return an access token."""
    auth_service = request.app.state.auth_service

    user = await auth_service.register_user(body)
    access_token = auth_service.create_access_token(data={"sub": user["email"]})

    return AuthResponse(
        access_token=access_token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: Request, body: LoginRequest):
    """Authenticate user credentials and return an access token."""
    auth_service = request.app.state.auth_service

    user = await auth_service.authenticate_user(body.email, body.password)
    access_token = auth_service.create_access_token(data={"sub": user["email"]})

    return AuthResponse(
        access_token=access_token,
        user=UserResponse(**user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request):
    """Return the currently authenticated user's profile."""
    user = await get_current_user(request)
    return UserResponse(**user)
