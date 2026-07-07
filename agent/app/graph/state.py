from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict

from ..schemas import HistoryMessage, MedicineBrief, ParsedSymptoms, Recommend, SessionSummary, TraceStep, UserProfile


class GraphState(TypedDict, total=False):
    # Inputs
    session_id: str
    question: str
    normalized_question: str
    medicines: list[MedicineBrief]
    user_profile: UserProfile
    history_messages: list[HistoryMessage]
    session_summary: SessionSummary
    conversation_status: str
    allow_rx_recommendation: bool

    # Intermediate
    parsed: ParsedSymptoms
    emergency: bool
    emergency_reasons: list[str]
    special_population_flags: list[str]
    candidates: list[MedicineBrief]
    review_decisions: list[dict[str, object]]
    safety_warnings: list[str]
    risk_level: str
    risked: list[Recommend]

    # Outputs
    answer: str
    recommends: list[Recommend]
    disclaimer: str
    updated_session_summary: SessionSummary

    # Trace accumulation (LangGraph merges via list concat)
    traces: Annotated[list[TraceStep], add]
