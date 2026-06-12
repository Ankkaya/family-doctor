"""候选药品准备节点。保留家庭药箱候选，不做语义硬过滤。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms
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
            candidates = [] if parsed.emergency or state.get("emergency") else medicines
            rec.set_output(
                {
                    "candidateIds": [medicine.id for medicine in candidates],
                    "candidateCount": len(candidates),
                    "candidateMedicines": [
                        {
                            "medicineId": medicine.id,
                            "name": medicine.name,
                            "otc": medicine.otc,
                            "indication": medicine.indication,
                        }
                        for medicine in candidates
                    ],
                    "count": len(candidates),
                }
            )
        return {"candidates": candidates, "traces": [rec.step]}

    return match
