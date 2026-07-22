"""Custom JWT authentication for Django REST Framework.

Replicates the same JWT scheme used by the old FastAPI backend so the
React frontend continues to work without any changes.
"""

import uuid
from datetime import datetime, timedelta, timezone

import jwt
from django.conf import settings
from rest_framework import authentication, exceptions

from core.models import User


def create_access_token(subject: str, extra: dict | None = None) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": subject, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        raise ValueError("Invalid token") from e


class JWTAuthentication(authentication.BaseAuthentication):
    """Authenticate requests using Bearer JWT tokens."""

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        token = auth_header[len(self.keyword) + 1 :]
        try:
            payload = decode_token(token)
        except ValueError:
            raise exceptions.AuthenticationFailed("Invalid or expired token")

        if payload.get("type") != "access":
            raise exceptions.AuthenticationFailed("Not an access token")

        try:
            user_id = uuid.UUID(payload["sub"])
        except (KeyError, ValueError):
            raise exceptions.AuthenticationFailed("Invalid token payload")

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found or inactive")

        return (user, token)
