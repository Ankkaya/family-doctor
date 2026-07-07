"""组装最终答复。急症信号时跳过推荐、仅返回急救引导。"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ...llm.provider import LLMProvider
from ...prompting import load_prompt
from ...schemas import ParsedSymptoms, Recommend
from ...tracing import trace_node
from ..context import dump_conversation_context

RENDER_PROMPT_KEY = "consult.render.system"
RENDER_PROMPT_VERSION = "v1"
RENDER_SYSTEM = load_prompt("render.system.v1.md")

EMERGENCY_ANSWER = (
    "你描述的症状可能涉及急症信号，建议立即拨打 120 或就近前往急诊。"
    "在等待期间保持患者呼吸道通畅、记录症状起始时间，不要自行用药。"
)

NO_RECOMMEND_ANSWER = (
    "目前没有找到与当前描述明确匹配的家庭药箱药品。建议补充症状细节，"
    "若疼痛持续、加重或伴随其他异常，请及时就医咨询。"
)


@dataclass
class RenderPlan:
    answer: str | None
    recommends: list[Recommend]
    prompt_used: bool
    prompt_user: str | None


def build_render_plan(state: dict[str, Any]) -> RenderPlan:
    parsed: ParsedSymptoms = state["parsed"]
    risked: list[Recommend] = state.get("risked") or []
    safety_warnings: list[str] = state.get("safety_warnings") or []

    if parsed.emergency or state.get("emergency"):
        return RenderPlan(
            answer=EMERGENCY_ANSWER,
            recommends=[],
            prompt_used=False,
            prompt_user=None,
        )

    if not risked:
        return RenderPlan(
            answer=NO_RECOMMEND_ANSWER,
            recommends=[],
            prompt_used=False,
            prompt_user=None,
        )

    prompt_user = (
        f"症状: {', '.join(parsed.symptoms) or '未明确'}\n"
        f"严重度: {parsed.severity}\n"
        f"候选药品数: {len(risked)}\n"
        f"安全审核: {'; '.join(safety_warnings) or '无'}"
    )
    return RenderPlan(
        answer=None,
        recommends=risked,
        prompt_used=True,
        prompt_user=prompt_user,
    )


def make_render_node(llm: LLMProvider, *, disclaimer: str):
    async def render(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        plan = build_render_plan(state)

        with trace_node(
            "render",
            {
                "emergency": parsed.emergency,
                "recommendCount": len(plan.recommends),
                "riskLevel": state.get("risk_level", "unknown"),
                "promptKey": RENDER_PROMPT_KEY,
                "promptVersion": RENDER_PROMPT_VERSION,
            },
        ) as rec:
            answer = plan.answer
            if plan.prompt_used and plan.prompt_user:
                answer = await llm.chat(system=RENDER_SYSTEM, user=plan.prompt_user)
            rec.set_output({
                "answerLength": len(answer or ""),
                "recommendCount": len(plan.recommends),
                "promptUsed": plan.prompt_used,
                "systemPrompt": RENDER_SYSTEM if plan.prompt_used else None,
                "userPrompt": plan.prompt_user,
            })
            rec.set_llm(model=llm.model)

        return {
            "answer": answer or "",
            "recommends": plan.recommends,
            "disclaimer": disclaimer,
            "traces": [rec.step],
        }

    return render
