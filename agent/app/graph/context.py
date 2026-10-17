from __future__ import annotations

from typing import Any

from ..schemas import SessionSummary
from ..llm.messages import HistoryChatMessage, conversation_history


def history_chat_messages(state: dict[str, Any]) -> list[HistoryChatMessage]:
    return conversation_history(state.get("history_messages") or [])


def dump_conversation_context(state: dict[str, Any]) -> dict[str, Any]:
    summary: SessionSummary | None = state.get("session_summary")
    return {
        "sessionSummary": summary.model_dump(by_alias=True) if summary else None,
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
