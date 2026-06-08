"""风险提示节点。通过 safety tools 生成 warnings + reason。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms, Recommend, UserProfile
from ...tools.safety_tools import build_recommendation
from ...tracing import trace_node


def make_risk_node():
    async def risk(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        profile: UserProfile | None = state.get("user_profile")
        candidates: list[MedicineBrief] = state.get("candidates") or []
        flags: list[str] = state.get("special_population_flags") or []
        with trace_node(
            "risk",
            {
                "candidateIds": [m.id for m in candidates],
                "populationHints": parsed.population_hints,
                "flags": flags,
            },
        ) as rec:
            risked: list[Recommend] = []
            for med in candidates:
                risked.append(build_recommendation(medicine=med, parsed=parsed, profile=profile, flags=flags))
            rec.set_output({"count": len(risked)})
        return {"risked": risked, "traces": [rec.step]}

    return risk
