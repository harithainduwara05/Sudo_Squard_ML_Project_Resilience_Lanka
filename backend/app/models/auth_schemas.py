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
        default="user",
        pattern="^(user|admin)$",
        description="Requested user role. Only the first bootstrap user becomes admin.",
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
    is_active: bool = True


class AuthResponse(BaseModel):
    """Schema for authentication response with token."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    """Schema for decoded JWT token data."""
    email: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    """Schema for updating user profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100, description="User's full name")
    organization: Optional[str] = Field(None, max_length=200, description="User's organization")


class PasswordChangeRequest(BaseModel):
    """Schema for changing user password."""
    current_password: str = Field(..., description="Current password for verification")
    new_password: str = Field(..., min_length=8, description="New password (min 8 characters)")

