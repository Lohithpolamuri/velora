"""
Centralized configuration, read from environment variables.

Copy backend/.env.example to backend/.env for local development and
adjust as needed. Never commit a real .env file with production
secrets in it.
"""
from dotenv import load_dotenv
load_dotenv(override=True)
import os


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in ("1", "true", "yes", "on")


def _get_list(name: str, default: list[str]) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    IS_PRODUCTION: bool = ENVIRONMENT.lower() == "production"

    # --- Database ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./app.db")

    # --- Sessions / cookies ---
    SESSION_EXPIRE_DAYS: int = int(os.getenv("SESSION_EXPIRE_DAYS", "7"))
    SESSION_COOKIE_NAME: str = "vertofi_session"
    CSRF_COOKIE_NAME: str = "vertofi_csrf_token"
    CSRF_HEADER_NAME: str = "X-CSRF-Token"
    # Secure cookies require HTTPS. Force True in production; allow
    # override locally only for non-production environments.
    COOKIE_SECURE: bool = _get_bool("COOKIE_SECURE", IS_PRODUCTION)
    COOKIE_SAMESITE: str = os.getenv("COOKIE_SAMESITE", "lax")
    COOKIE_DOMAIN: str | None = os.getenv("COOKIE_DOMAIN") or None

    # --- CORS ---
    ALLOWED_ORIGINS: list[str] = _get_list(
        "ALLOWED_ORIGINS", ["http://localhost:5173"]
    )

    # --- Frontend (used to build links in emails) ---
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # --- Email verification ---
    EMAIL_VERIFICATION_EXPIRE_HOURS: int = int(
        os.getenv("EMAIL_VERIFICATION_EXPIRE_HOURS", "24")
    )

    # --- SMTP (real email delivery) ---
    # If SMTP_HOST is unset, the app runs in "dev mode": instead of
    # sending a real email, it logs the verification link to the
    # console so development can proceed without real credentials.
    SMTP_HOST: str | None = os.getenv("SMTP_HOST") or None
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str | None = os.getenv("SMTP_USER") or None
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD") or None
    SMTP_FROM_EMAIL: str = os.getenv("SMTP_FROM_EMAIL", "no-reply@vertofi.local")
    SMTP_USE_TLS: bool = _get_bool("SMTP_USE_TLS", True)

    # --- Rate limiting (in-memory, single-process) ---
    LOGIN_MAX_ATTEMPTS: int = int(os.getenv("LOGIN_MAX_ATTEMPTS", "10"))
    LOGIN_WINDOW_SECONDS: int = int(os.getenv("LOGIN_WINDOW_SECONDS", "60"))
    REGISTER_MAX_ATTEMPTS: int = int(os.getenv("REGISTER_MAX_ATTEMPTS", "5"))
    REGISTER_WINDOW_SECONDS: int = int(os.getenv("REGISTER_WINDOW_SECONDS", "60"))
    RESEND_VERIFICATION_MAX_ATTEMPTS: int = int(
        os.getenv("RESEND_VERIFICATION_MAX_ATTEMPTS", "3")
    )
    RESEND_VERIFICATION_WINDOW_SECONDS: int = int(
        os.getenv("RESEND_VERIFICATION_WINDOW_SECONDS", "300")
    )
    INVITE_MAX_ATTEMPTS: int = int(os.getenv("INVITE_MAX_ATTEMPTS", "10"))
    INVITE_WINDOW_SECONDS: int = int(os.getenv("INVITE_WINDOW_SECONDS", "600"))


settings = Settings()
