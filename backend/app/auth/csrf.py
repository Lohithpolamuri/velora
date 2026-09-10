"""
CSRF protection using the double-submit cookie pattern.

Why this is needed now: authentication moved from an Authorization
header (which cross-site requests can't forge) to a cookie (which the
browser attaches automatically to same-site requests). SameSite=Lax
already blocks the cookie on most cross-site POST/PUT/DELETE requests
in modern browsers, but that's a browser-behavior detail, not a
guarantee -- explicit CSRF verification is the correct defense-in-depth
and is what Phase 3 asked for.

How it works:
- On login, the server sets a second cookie (NOT HttpOnly, so the
  frontend JS can read it) containing a random CSRF token.
- The frontend reads that cookie and sends its value back in the
  `X-CSRF-Token` header on every state-changing request.
- The server checks that the header value matches the cookie value.

An attacker on another origin can trigger a request that *includes*
the session cookie automatically, but cannot read the CSRF cookie
(browsers enforce same-origin cookie access) and so cannot produce a
matching header value.
"""
import secrets

from fastapi import Cookie, Header, HTTPException

from app.config import settings


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def verify_csrf(
    csrf_cookie: str | None = Cookie(default=None, alias=settings.CSRF_COOKIE_NAME),
    csrf_header: str | None = Header(default=None, alias=settings.CSRF_HEADER_NAME),
) -> None:
    if not csrf_cookie or not csrf_header or not secrets.compare_digest(
        csrf_cookie, csrf_header
    ):
        raise HTTPException(status_code=403, detail="Invalid or missing CSRF token")
