from __future__ import annotations

from hmac import compare_digest

from fastapi import Header, HTTPException, Request, status


async def require_agent_token(
    request: Request,
    x_agent_token: str | None = Header(default=None),
) -> None:
    expected = request.app.state.settings.agent_internal_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agent internal authentication is not configured",
        )
    if not x_agent_token or not compare_digest(x_agent_token, expected):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid agent token",
        )
