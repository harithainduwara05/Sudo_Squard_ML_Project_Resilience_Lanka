"""
Authentication service for user registration, login, and JWT management.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import JWTError, jwt
import bcrypt
from bson import ObjectId
from bson.errors import InvalidId

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

        user_count = await self.users_collection.count_documents({})
        assigned_role = "admin" if user_count == 0 else "user"

        user_doc = {
            "full_name": request.full_name,
            "email": request.email,
            "password": self.hash_password(request.password),
            "organization": request.organization,
            "role": assigned_role,
            "is_active": True,
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
            "is_active": user_doc["is_active"],
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
        if user.get("is_active") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This account has been deactivated",
            )

        return self._serialize_user(user)

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Find a user by email in the 'users' collection."""
        user = await self.users_collection.find_one({"email": email})
        return self._serialize_user(user) if user else None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Find a user by MongoDB ObjectId string."""
        object_id = self._to_object_id(user_id)
        user = await self.users_collection.find_one({"_id": object_id})
        return self._serialize_user(user) if user else None

    async def list_users(self, search: Optional[str] = None) -> tuple[list[dict], int]:
        """Return users for the admin dashboard, newest first."""
        query = {}
        if search:
            query = {
                "$or": [
                    {"full_name": {"$regex": search, "$options": "i"}},
                    {"email": {"$regex": search, "$options": "i"}},
                    {"organization": {"$regex": search, "$options": "i"}},
                    {"role": {"$regex": search, "$options": "i"}},
                ]
            }

        total = await self.users_collection.count_documents(query)
        cursor = (
            self.users_collection
            .find(query, {"password": 0})
            .sort("created_at", -1)
            .limit(100)
        )
        users = [self._serialize_user(user) async for user in cursor]
        return users, total

    async def get_user_counts(self) -> dict:
        """Return user totals used by the admin overview."""
        total_users = await self.users_collection.count_documents({})
        active_users = await self.users_collection.count_documents(
            {"is_active": {"$ne": False}}
        )
        admin_users = await self.users_collection.count_documents(
            {"role": "admin", "is_active": {"$ne": False}}
        )
        return {
            "total_users": total_users,
            "active_users": active_users,
            "admin_users": admin_users,
        }

    async def update_user_role(self, user_id: str, role: str) -> dict:
        """Change a user's role and return the updated user."""
        object_id = self._to_object_id(user_id)
        result = await self.users_collection.update_one(
            {"_id": object_id},
            {"$set": {"role": role}},
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = await self.users_collection.find_one({"_id": object_id})
        return self._serialize_user(user)

    async def update_user_status(self, user_id: str, is_active: bool) -> dict:
        """Activate or deactivate a user account."""
        object_id = self._to_object_id(user_id)
        result = await self.users_collection.update_one(
            {"_id": object_id},
            {"$set": {"is_active": is_active}},
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = await self.users_collection.find_one({"_id": object_id})
        return self._serialize_user(user)

    async def delete_user(self, user_id: str) -> None:
        """Permanently remove a user account."""
        object_id = self._to_object_id(user_id)
        result = await self.users_collection.delete_one({"_id": object_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

    async def update_user_profile(self, user_id: str, full_name: str = None, organization: str = None) -> dict:
        """Update a user's profile fields (name, organization)."""
        object_id = self._to_object_id(user_id)
        update_fields = {}
        if full_name is not None:
            update_fields["full_name"] = full_name
        if organization is not None:
            update_fields["organization"] = organization

        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        result = await self.users_collection.update_one(
            {"_id": object_id},
            {"$set": update_fields},
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        user = await self.users_collection.find_one({"_id": object_id})
        return self._serialize_user(user)

    async def change_password(self, user_id: str, current_password: str, new_password: str) -> dict:
        """Change a user's password after verifying the current one."""
        object_id = self._to_object_id(user_id)
        user = await self.users_collection.find_one({"_id": object_id})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if not self.verify_password(current_password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )

        new_hashed = self.hash_password(new_password)
        await self.users_collection.update_one(
            {"_id": object_id},
            {"$set": {"password": new_hashed}},
        )
        return self._serialize_user(user)

    def _to_object_id(self, user_id: str) -> ObjectId:
        """Convert a string to ObjectId with a consistent API error."""
        try:
            return ObjectId(user_id)
        except InvalidId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user id",
            )

    def _serialize_user(self, user: dict) -> dict:
        """Return the public user shape used by API responses."""
        role = user["role"]
        if role in {"officer", "researcher"}:
            role = "user"

        return {
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "organization": user.get("organization"),
            "role": role,
            "created_at": user["created_at"],
            "is_active": user.get("is_active", True),
        }
