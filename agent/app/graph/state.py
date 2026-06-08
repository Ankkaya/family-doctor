from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict

from ..schemas import MedicineBrief, ParsedSymptoms, Recommend, TraceStep, UserProfile


class GraphState(TypedDict, total=False):
    # Inputs
    session_id: str
    question: str
    normalized_question: str
    medicines: list[MedicineBrief]
    user_profile: UserProfile
    allow_rx_recommendation: bool

    # Intermediate
    parsed: ParsedSymptoms
    emergency: bool
    emergency_reasons: list[str]
    special_population_flags: list[str]
    candidates: list[MedicineBrief]
    safety_warnings: list[str]
    risk_level: str
    risked: list[Recommend]

    # Outputs
    answer: str
    recommends: list[Recommend]
    disclaimer: str

    # Trace accumulation (LangGraph merges via list concat)
    traces: Annotated[list[TraceStep], add]
