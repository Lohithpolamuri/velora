import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.config import settings


def create_verification_token() -> str:
    return secrets.token_urlsafe(48)


def hash_verification_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_verification_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(
        hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
    )
