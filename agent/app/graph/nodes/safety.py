"""安全审核节点。汇总推荐前风险。"""
from __future__ import annotations

from typing import Any

from ...schemas import Recommend
from ...tools.safety_tools import audit_recommendations
from ...tracing import trace_node


def make_safety_node():
    async def safety(state: dict[str, Any]) -> dict[str, Any]:
        risked: list[Recommend] = state.get("risked") or []
        emergency = bool(state.get("emergency"))
        flags: list[str] = state.get("special_population_flags") or []
        with trace_node(
            "safety",
            {"recommendCount": len(risked), "emergency": emergency, "flags": flags},
        ) as rec:
            risk_level, warnings = audit_recommendations(
                recommends=risked,
                emergency=emergency,
                flags=flags,
            )
            rec.set_output({"riskLevel": risk_level, "warnings": warnings})
        return {"risk_level": risk_level, "safety_warnings": warnings, "traces": [rec.step]}

    return safety
