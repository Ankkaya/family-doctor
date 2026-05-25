"""药品召回节点。v1: 纯 Python 关键词评分。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms
from ...tracing import trace_node

TOP_K = 5


def _score(med: MedicineBrief, symptoms: list[str]) -> int:
    haystack = f"{med.name} {med.indication}".lower()
    return sum(1 for s in symptoms if s and s.lower() in haystack)


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
            # v1 硬规则：默认只留 OTC；用户开启后才允许 RX 进入候选；急症直接返回空
            candidates: list[MedicineBrief] = []
            if not parsed.emergency:
                scored = [
                    (m, _score(m, parsed.symptoms))
                    for m in medicines
                    if allow_rx_recommendation or m.otc == "OTC"
                ]
                scored.sort(key=lambda x: x[1], reverse=True)
                candidates = [m for m, s in scored if s > 0][:TOP_K]
                # 保底：若无关键词命中，取前 TOP_K 个 OTC 作为宽松候选
                if not candidates:
                    candidates = [m for m, _ in scored][:TOP_K]
            rec.set_output(
                {"candidateIds": [m.id for m in candidates], "count": len(candidates)}
            )
        return {"candidates": candidates, "traces": [rec.step]}

    return match
