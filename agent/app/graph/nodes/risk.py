"""风险提示节点。针对每个候选药，给出 warnings + reason。"""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from ...llm.provider import LLMProvider
from ...schemas import MedicineBrief, ParsedSymptoms, Recommend
from ...tracing import trace_node

RISK_SYSTEM = (
    "你是家庭用药风险审阅助手。给定用户画像与候选药品，逐一给出：\n"
    "- reason：推荐理由（为何匹配）\n"
    "- warnings：禁忌/慎用人群警告\n"
    "不要编造禁忌，仅基于给定字段。"
)


class _RiskOut(BaseModel):
    reason: str
    warnings: list[str] = Field(default_factory=list)


def make_risk_node(llm: LLMProvider):
    async def risk(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        candidates: list[MedicineBrief] = state.get("candidates") or []
        with trace_node(
            "risk",
            {"candidateIds": [m.id for m in candidates], "populationHints": parsed.population_hints},
        ) as rec:
            risked: list[Recommend] = []
            for med in candidates:
                user = (
                    f"用户症状: {', '.join(parsed.symptoms) or '未知'}\n"
                    f"人群提示: {', '.join(parsed.population_hints) or '无'}\n"
                    f"药品: {med.name}\n"
                    f"适应症: {med.indication}\n"
                    f"禁忌: {med.contraindication or '（无）'}\n"
                    f"不良反应: {med.adverse_reaction or '（无）'}"
                )
                out = await llm.structured(system=RISK_SYSTEM, user=user, schema=_RiskOut)
                risked.append(
                    Recommend(
                        medicineId=med.id,
                        name=med.name,
                        otc=med.otc,
                        indication=med.indication,
                        reason=out.reason,
                        warnings=out.warnings,
                    )
                )
            rec.set_output({"count": len(risked)})
            rec.set_llm(model=llm.model)
        return {"risked": risked, "traces": [rec.step]}

    return risk
