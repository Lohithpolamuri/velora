import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from app.config import settings


def create_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.SESSION_EXPIRE_DAYS)
