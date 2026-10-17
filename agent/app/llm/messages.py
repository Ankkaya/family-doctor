from __future__ import annotations

from collections.abc import Sequence
from typing import Literal, TypedDict

from ..schemas import ConversationMessageBrief, HistoryMessage


class HistoryChatMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str


def conversation_history(
    messages: Sequence[HistoryMessage | ConversationMessageBrief],
) -> list[HistoryChatMessage]:
    history: list[HistoryChatMessage] = [
        {"role": "assistant" if message.role == "ASSISTANT" else "user", "content": message.content}
        for message in messages[-10:]
        if message.content.strip()
    ]
    return history


def text_messages(
    *, system: str, user: str, history: list[HistoryChatMessage] | None = None,
) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": system},
        *[{"role": message["role"], "content": message["content"]} for message in history or []],
        {"role": "user", "content": user},
    ]
