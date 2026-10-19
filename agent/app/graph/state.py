from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict

from ..schemas import (
    HistoryMessage,
    MedicineBrief,
    Recommend,
    SessionSummary,
    TraceStep,
    UserProfile,
)


class GraphState(TypedDict, total=False):
    # Inputs
    session_id: str
    question: str
    resolved_question: str
    cabinet_scope: str
    medicines: list[MedicineBrief]
    user_profile: UserProfile
    history_messages: list[HistoryMessage]
    session_summary: SessionSummary
    conversation_status: str
    allow_rx_recommendation: bool

    candidates: list[MedicineBrief]

    # Outputs
    answer: str
    recommends: list[Recommend]
    disclaimer: str
    updated_session_summary: SessionSummary

    # Trace accumulation (LangGraph merges via list concat)
    traces: Annotated[list[TraceStep], add]
