"""
Authentication service for user registration, login, and JWT management.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
import bcrypt

from app.config import settings
from app.models.auth_schemas import RegisterRequest, TokenData


class AuthService:
    """Handles user authentication, password hashing, and JWT tokens."""

    def __init__(self, db):
        """
        Initialize the auth service.

        Args:
            db: MongoDB database instance (from motor).
        """
        self.db = db
        self.users_collection = db["users"]

    # ── Password helpers ──────────────────────────────────────────────────

    def hash_password(self, password: str) -> str:
        """Hash a plain-text password using bcrypt."""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(self, plain: str, hashed: str) -> bool:
        """Verify a plain-text password against its bcrypt hash."""
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

    # ── JWT helpers ───────────────────────────────────────────────────────

    def create_access_token(self, data: dict) -> str:
        """
        Create a JWT access token.

        Args:
            data: Payload to encode (typically {"sub": email}).

        Returns:
            Encoded JWT string.
        """
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.JWT_EXPIRY_MINUTES
        )
        to_encode.update({"exp": expire})
        return jwt.encode(
            to_encode,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )

    def verify_token(self, token: str) -> TokenData:
        """
        Decode and validate a JWT token.

        Args:
            token: Encoded JWT string.

        Returns:
            TokenData with the extracted email.

        Raises:
            HTTPException 401 if the token is invalid or expired.
        """
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            email: Optional[str] = payload.get("sub")
            if email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing subject",
                )
            return TokenData(email=email)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

    # ── User operations ───────────────────────────────────────────────────

    async def register_user(self, request: RegisterRequest) -> dict:
        """
        Register a new user.

        1. Check if the email is already taken.
        2. Hash the password.
        3. Insert into the 'users' collection.
        4. Return the user dict (without password).

        Raises:
            HTTPException 400 if email already exists.
        """
        existing = await self.users_collection.find_one({"email": request.email})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        user_doc = {
            "full_name": request.full_name,
            "email": request.email,
            "password": self.hash_password(request.password),
            "organization": request.organization,
            "role": request.role,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        result = await self.users_collection.insert_one(user_doc)

        # Return user without password
        return {
            "id": str(result.inserted_id),
            "full_name": user_doc["full_name"],
            "email": user_doc["email"],
            "organization": user_doc["organization"],
            "role": user_doc["role"],
            "created_at": user_doc["created_at"],
        }

    async def authenticate_user(self, email: str, password: str) -> dict:
        """
        Authenticate a user by email and password.

        Raises:
            HTTPException 401 if credentials are invalid.
        """
        user = await self.users_collection.find_one({"email": email})
        if not user or not self.verify_password(password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        return {
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "organization": user.get("organization"),
            "role": user["role"],
            "created_at": user["created_at"],
        }

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Find a user by email in the 'users' collection."""
        user = await self.users_collection.find_one({"email": email})
        if user:
            return {
                "id": str(user["_id"]),
                "full_name": user["full_name"],
                "email": user["email"],
                "organization": user.get("organization"),
                "role": user["role"],
                "created_at": user["created_at"],
            }
        return None
