from __future__ import annotations

from typing import Any

from ..schemas import HistoryMessage, SessionSummary


def dump_conversation_context(state: dict[str, Any]) -> dict[str, Any]:
    summary: SessionSummary | None = state.get("session_summary")
    messages: list[HistoryMessage] = state.get("history_messages") or []
    return {
        "sessionSummary": summary.model_dump(by_alias=True) if summary else None,
        "recentMessages": [
            {
                "role": message.role,
                "content": message.content,
                "createdAt": message.created_at,
            }
            for message in messages
        ],
        "conversationStatus": state.get("conversation_status") or "active",
    }


def merge_unique(*groups: list[str]) -> list[str]:
    result: list[str] = []
    for group in groups:
        for item in group:
            normalized = item.strip()
            if normalized and normalized not in result:
                result.append(normalized)
    return result
