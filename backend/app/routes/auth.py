from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.session import Session as UserSession
from app.models.email_verification import EmailVerificationToken
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserOut,
    PasswordChange,
    ResendVerificationRequest,
)
from app.auth.security import hash_password, verify_password
from app.auth.dependencies import get_current_user
from app.auth.session_manager import (
    create_session_token,
    hash_session_token,
    get_session_expiry,
)
from app.auth.verification_tokens import (
    create_verification_token,
    hash_verification_token,
    get_verification_expiry,
)
from app.auth.email_sender import send_verification_email
from app.auth.csrf import generate_csrf_token, verify_csrf
from app.auth.rate_limit import enforce_rate_limit
from app.services import get_or_create_workspace, add_activity, add_notification

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_verification_token(db: Session, user: User) -> str:
    raw_token = create_verification_token()
    record = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_verification_token(raw_token),
        expires_at=get_verification_expiry(),
    )
    db.add(record)
    db.commit()
    send_verification_email(user.email, user.name, raw_token)
    return raw_token


def _set_auth_cookies(response: Response, session_token: str) -> None:
    max_age = settings.SESSION_EXPIRE_DAYS * 24 * 60 * 60

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=max_age,
        path="/",
    )
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=generate_csrf_token(),
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=max_age,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(key=settings.SESSION_COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/")
    response.delete_cookie(key=settings.CSRF_COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/")


@router.post("/register", status_code=201)
def register(user_data: UserCreate, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "register", settings.REGISTER_MAX_ATTEMPTS, settings.REGISTER_WINDOW_SECONDS)

    existing_user = db.query(User).filter(User.email == str(user_data.email).lower()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user_data.name.strip(),
        email=str(user_data.email).lower(),
        password_hash=hash_password(user_data.password),
        is_verified=False,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    _issue_verification_token(db, new_user)
    get_or_create_workspace(db, new_user)

    return {"message": "Account created. Check your email to verify your account before signing in."}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    token_hash = hash_verification_token(token)
    record = db.query(EmailVerificationToken).filter(EmailVerificationToken.token_hash == token_hash).first()

    if not record:
        raise HTTPException(status_code=400, detail="Invalid or already-used verification link")
    if record.used_at is not None:
        raise HTTPException(status_code=400, detail="This verification link has already been used")

    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This verification link has expired. Request a new one.")

    user = db.query(User).filter(User.id == record.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification link")

    user.is_verified = True
    user.verified_at = datetime.now(timezone.utc)
    record.used_at = datetime.now(timezone.utc)
    db.commit()

    return {"message": "Your email has been verified. You can now sign in."}


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "resend-verification", settings.RESEND_VERIFICATION_MAX_ATTEMPTS, settings.RESEND_VERIFICATION_WINDOW_SECONDS)

    generic_response = {"message": "If an account with that email exists and isn't verified yet, a new link has been sent."}
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user and not user.is_verified:
        _issue_verification_token(db, user)

    return generic_response


@router.post("/login")
def login(credentials: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "login", settings.LOGIN_MAX_ATTEMPTS, settings.LOGIN_WINDOW_SECONDS)

    email = str(credentials.email).lower()
    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    session_token = create_session_token()
    user_session = UserSession(
        user_id=user.id,
        token_hash=hash_session_token(session_token),
        expires_at=get_session_expiry(),
    )
    db.add(user_session)
    db.commit()

    _set_auth_cookies(response, session_token)
    workspace = get_or_create_workspace(db, user)
    add_activity(db, user.id, workspace.id, "Logged in", "Signed in to your account")

    return {"message": "Login successful"}


@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db), _csrf: None = Depends(verify_csrf)):
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)

    if session_token:
        token_hash = hash_session_token(session_token)
        user_session = db.query(UserSession).filter(UserSession.token_hash == token_hash).first()
        if user_session:
            db.delete(user_session)
            db.commit()

    _clear_auth_cookies(response)

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(verify_csrf),
):
    email = str(user_data.email).lower()
    existing_user = db.query(User).filter(User.email == email, User.id != current_user.id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    current_user.name = user_data.name.strip()
    current_user.email = email
    db.commit()
    workspace = get_or_create_workspace(db, current_user)
    add_activity(db, current_user.id, workspace.id, "Updated profile", "Changed account information")
    db.refresh(current_user)

    return current_user


@router.put("/me/password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _csrf: None = Depends(verify_csrf),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from your current password")

    current_user.password_hash = hash_password(payload.new_password)
    db.query(UserSession).filter(UserSession.user_id == current_user.id).delete()
    db.commit()
    workspace = get_or_create_workspace(db, current_user)
    add_activity(db, current_user.id, workspace.id, "Changed password", "Updated account password")

    return {"message": "Password updated successfully. Please log in again."}