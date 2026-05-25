from __future__ import annotations

from operator import add
from typing import Annotated

from typing_extensions import TypedDict

from ..schemas import MedicineBrief, ParsedSymptoms, Recommend, TraceStep


class GraphState(TypedDict, total=False):
    # Inputs
    session_id: str
    question: str
    medicines: list[MedicineBrief]

    # Intermediate
    parsed: ParsedSymptoms
    candidates: list[MedicineBrief]
    risked: list[Recommend]

    # Outputs
    answer: str
    recommends: list[Recommend]
    disclaimer: str

    # Trace accumulation (LangGraph merges via list concat)
    traces: Annotated[list[TraceStep], add]
