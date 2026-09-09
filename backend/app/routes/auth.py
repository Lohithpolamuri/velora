from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.session import Session as UserSession
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserOut,
    PasswordChange,
)
from app.auth.security import hash_password, verify_password
from app.auth.dependencies import get_current_user
from app.auth.session_manager import (
    create_session_token,
    hash_session_token,
    get_session_expiry,
)

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE_NAME = "vertofi_session"


@router.post("/register", response_model=UserOut)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        name=user_data.name.strip(),
        email=str(user_data.email).lower(),
        password_hash=hash_password(user_data.password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login")
def login(
    credentials: UserLogin,
    response: Response,
    db: Session = Depends(get_db),
):
    email = str(credentials.email).lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    session_token = create_session_token()

    user_session = UserSession(
        user_id=user.id,
        token_hash=hash_session_token(session_token),
        expires_at=get_session_expiry(),
    )

    db.add(user_session)
    db.commit()

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
        path="/",
    )

    return {"message": "Login successful"}


@router.post("/logout")
def logout(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)

    if session_token:
        token_hash = hash_session_token(session_token)

        user_session = (
            db.query(UserSession)
            .filter(UserSession.token_hash == token_hash)
            .first()
        )

        if user_session:
            db.delete(user_session)
            db.commit()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
    )

    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    email = str(user_data.email).lower()

    existing_user = (
        db.query(User)
        .filter(
            User.email == email,
            User.id != current_user.id,
        )
        .first()
    )

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    current_user.name = user_data.name.strip()
    current_user.email = email

    db.commit()
    db.refresh(current_user)

    return current_user


@router.put("/me/password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(
        payload.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect",
        )

    if verify_password(
        payload.new_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=400,
            detail="New password must be different from your current password",
        )

    current_user.password_hash = hash_password(payload.new_password)

    db.query(UserSession).filter(
        UserSession.user_id == current_user.id
    ).delete()

    db.commit()

    return {"message": "Password updated successfully"}