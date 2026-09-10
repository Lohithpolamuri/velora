import hashlib
import secrets
from datetime import datetime, timedelta, timezone

INVITATION_EXPIRE_DAYS = 7


def create_invitation_token() -> str:
    return secrets.token_urlsafe(48)


def hash_invitation_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_invitation_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=INVITATION_EXPIRE_DAYS)
