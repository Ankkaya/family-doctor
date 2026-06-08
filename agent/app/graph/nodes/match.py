"""药品召回节点。通过 search_medicines tool 选择候选药。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms
from ...tools.medicine_search import search_medicines
from ...tracing import trace_node


def make_match_node():
    async def match(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        medicines: list[MedicineBrief] = state.get("medicines") or []
        allow_rx_recommendation = bool(state.get("allow_rx_recommendation"))
        with trace_node(
            "match",
            {
                "symptoms": parsed.symptoms,
                "medicineCount": len(medicines),
                "allowRxRecommendation": allow_rx_recommendation,
            },
        ) as rec:
            candidates = search_medicines(
                medicines=medicines,
                parsed=parsed,
                allow_rx_recommendation=allow_rx_recommendation,
                emergency=bool(state.get("emergency")),
            )
            rec.set_output(
                {
                    "candidateIds": [m.id for m in candidates],
                    "searchScores": {m.id: m.search_score for m in candidates},
                    "count": len(candidates),
                }
            )
        return {"candidates": candidates, "traces": [rec.step]}

    return match
