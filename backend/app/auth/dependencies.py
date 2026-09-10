from datetime import datetime, timezone

from fastapi import Cookie, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models.session import Session
from app.models.user import User
from app.auth.session_manager import hash_session_token


def get_current_user(
    session_token: str | None = Cookie(
        default=None,
        alias=settings.SESSION_COOKIE_NAME,
    ),
    db: DBSession = Depends(get_db),
):
    if not session_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    token_hash = hash_session_token(session_token)

    session = db.query(Session).filter(Session.token_hash == token_hash).first()

    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="Session expired")

    user = db.query(User).filter(User.id == session.user_id).first()

    if not user:
        db.delete(session)
        db.commit()
        raise HTTPException(status_code=401, detail="User not found")

    return user