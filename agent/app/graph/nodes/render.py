"""组装最终答复。急症信号时跳过推荐、仅返回急救引导。"""
from __future__ import annotations

from typing import Any

from ...llm.provider import LLMProvider
from ...schemas import ParsedSymptoms, Recommend
from ...tracing import trace_node

RENDER_SYSTEM = (
    "你是家庭用药参考助手（非医生）。基于已选候选药品与用户描述，写一段 80 字以内的"
    "中文答复：先总结症状，再提示关注点（补水/休息/就医信号），不要重复列出药名。"
)

EMERGENCY_ANSWER = (
    "你描述的症状可能涉及急症信号，建议立即拨打 120 或就近前往急诊。"
    "在等待期间保持患者呼吸道通畅、记录症状起始时间，不要自行用药。"
)


def make_render_node(llm: LLMProvider, *, disclaimer: str):
    async def render(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        risked: list[Recommend] = state.get("risked") or []
        safety_warnings: list[str] = state.get("safety_warnings") or []

        with trace_node(
            "render",
            {
                "emergency": parsed.emergency,
                "recommendCount": len(risked),
                "riskLevel": state.get("risk_level", "unknown"),
            },
        ) as rec:
            if parsed.emergency or state.get("emergency"):
                answer = EMERGENCY_ANSWER
                recommends: list[Recommend] = []
            else:
                user = (
                    f"症状: {', '.join(parsed.symptoms) or '未明确'}\n"
                    f"严重度: {parsed.severity}\n"
                    f"候选药品数: {len(risked)}\n"
                    f"安全审核: {'; '.join(safety_warnings) or '无'}"
                )
                answer = await llm.chat(system=RENDER_SYSTEM, user=user)
                recommends = risked
            rec.set_output({"answerLength": len(answer), "recommendCount": len(recommends)})
            rec.set_llm(model=llm.model)

        return {
            "answer": answer,
            "recommends": recommends,
            "disclaimer": disclaimer,
            "traces": [rec.step],
        }

    return render
