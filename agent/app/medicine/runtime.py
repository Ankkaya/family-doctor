from __future__ import annotations

from dataclasses import dataclass, field

from langchain_core.messages import AIMessage

from ..schemas import MedicineBrief, TraceStep


@dataclass
class MedicineRun:
    original_question: str
    resolved_question: str
    responses: list[AIMessage] = field(default_factory=list)
    lookups: list[dict] = field(default_factory=list)
    candidates: dict[str, MedicineBrief] = field(default_factory=dict)
    traces: list[TraceStep] = field(default_factory=list)
    rewritten: bool = False
    rewrite_failed: bool = False
    accepted_answer: str = ""
    evaluations: list[dict] = field(default_factory=list)
    context: dict = field(default_factory=dict)

    @property
    def no_result(self) -> bool:
        return not self.candidates
