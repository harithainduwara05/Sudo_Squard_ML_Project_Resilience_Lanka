"""
Pydantic schemas for authentication requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Schema for user registration."""
    full_name: str = Field(..., min_length=2, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, description="User's password")
    organization: Optional[str] = None
    role: str = Field(
        default="officer",
        pattern="^(officer|admin|researcher)$",
        description="User role: officer, admin, or researcher",
    )


class LoginRequest(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class UserResponse(BaseModel):
    """Schema for user data returned in responses."""
    id: str
    full_name: str
    email: str
    organization: Optional[str] = None
    role: str
    created_at: str


class AuthResponse(BaseModel):
    """Schema for authentication response with token."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded JWT token data."""
    email: Optional[str] = None
