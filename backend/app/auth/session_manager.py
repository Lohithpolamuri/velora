import hashlib
import secrets
from datetime import datetime, timedelta, timezone


SESSION_COOKIE_NAME = "vertofi_session"
SESSION_EXPIRE_DAYS = 7


def create_session_token() -> str:
    return secrets.token_urlsafe(48)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_session_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=SESSION_EXPIRE_DAYS)