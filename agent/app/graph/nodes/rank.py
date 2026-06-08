"""药品排序节点。按匹配度、安全性和 OTC 优先级排序。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms
from ...tracing import trace_node


def _score(med: MedicineBrief, symptoms: list[str], flags: list[str]) -> int:
    haystack = f"{med.name} {med.indication}".lower()
    score = sum(4 for symptom in symptoms if symptom and symptom.lower() in haystack)
    if med.otc == "OTC":
        score += 2
    if med.contraindication and any(flag in med.contraindication for flag in flags):
        score -= 5
    return score


def make_rank_node():
    async def rank(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        candidates: list[MedicineBrief] = state.get("candidates") or []
        flags: list[str] = state.get("special_population_flags") or []
        with trace_node("rank", {"candidateIds": [m.id for m in candidates], "flags": flags}) as rec:
            ranked = sorted(candidates, key=lambda med: _score(med, parsed.symptoms, flags), reverse=True)
            rec.set_output({"rankedIds": [m.id for m in ranked]})
        return {"candidates": ranked, "traces": [rec.step]}

    return rank
