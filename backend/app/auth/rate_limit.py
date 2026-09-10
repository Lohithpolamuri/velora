"""
Minimal in-memory rate limiter for sensitive auth endpoints (login,
register, resend-verification) to slow down brute-force / spam abuse.

This is intentionally dependency-free (fixed window, per-process
memory) so it works without adding a new library. It is NOT sufficient
once you run more than one backend process/instance behind a load
balancer, because each process has its own counters -- at that point,
move this to a shared store (e.g. Redis via slowapi) so all instances
share the same limits. Flagging that clearly rather than pretending
this scales further than it does.
"""
import time
from collections import defaultdict

from fastapi import HTTPException, Request

_hits: dict[tuple[str, str], list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_rate_limit(
    request: Request, bucket: str, max_attempts: int, window_seconds: int
) -> None:
    key = (bucket, _client_key(request))
    now = time.time()
    window_start = now - window_seconds

    hits = [t for t in _hits[key] if t > window_start]
    if len(hits) >= max_attempts:
        raise HTTPException(
            status_code=429,
            detail="Too many attempts. Please wait and try again.",
        )

    hits.append(now)
    _hits[key] = hits
