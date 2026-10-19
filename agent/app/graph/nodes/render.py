"""组装最终答复。急症信号时跳过推荐、仅返回急救引导。"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from ...prompting import load_prompt
from ...schemas import ParsedSymptoms, Recommend
from ..medicine_profile import MEDICINE_SYSTEM

RENDER_PROMPT_KEY = "consult.render.system"
RENDER_PROMPT_VERSION = "v3"
RENDER_SYSTEM = MEDICINE_SYSTEM + "\n\n" + load_prompt("render.system.v3.md")

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
    task = state.get("medicine_task", "medication_advice")
    risked: list[Recommend] = (state.get("risked") or []) if task == "medication_advice" else []
    safety_warnings: list[str] = state.get("safety_warnings") or []

    if parsed.emergency or state.get("emergency"):
        return RenderPlan(
            answer=EMERGENCY_ANSWER,
            recommends=[],
            prompt_used=False,
            prompt_user=None,
        )

    if (
        task == "medication_advice"
        and not risked
        and state.get("cabinet_tool_used")
        and not state.get("candidates")
    ):
        return RenderPlan(
            answer=NO_RECOMMEND_ANSWER,
            recommends=[],
            prompt_used=False,
            prompt_user=None,
        )

    prompt_user = (
        f"task: {task}\n"
        f"本轮用户问题: {state['question']}\n"
        f"消解后的问题: {state.get('resolved_question') or state['question']}\n"
        f"症状: {', '.join(parsed.symptoms) or '未明确'}\n"
        f"严重度: {parsed.severity}\n"
        f"候选药品数: {len(risked)}\n"
        f"药箱是否已查询: {bool(state.get('cabinet_tool_used'))}\n"
        f"查询参数: {json.dumps(state['medicine_plan'].model_dump() if state.get('medicine_plan') else None, ensure_ascii=False)}\n"
        f"相关健康资料: {json.dumps(state['user_profile'].model_dump(by_alias=True) if task == 'medication_advice' and state.get('user_profile') else None, ensure_ascii=False)}\n"
        f"可引用的药品资料: {json.dumps([item.model_dump(by_alias=True) for item in state.get('candidates', [])], ensure_ascii=False)}\n"
        f"允许推荐的药品: {json.dumps([item.model_dump(by_alias=True) for item in risked], ensure_ascii=False)}\n"
        f"审核结果: {json.dumps(state.get('review_decisions', []), ensure_ascii=False)}\n"
        "涉及用户药箱的库存与具体记录，仅依据工具返回；独立的一般知识不能标成药箱来源。药箱记录不等于官方说明书。"
        "可以解释药品资料，但不得推荐未通过审核的药品；未查询药箱时不得声称药箱里有或没有某药。\n"
        f"安全审核: {'; '.join(safety_warnings) or '无'}"
    )
    return RenderPlan(
        answer=None,
        recommends=risked,
        prompt_used=True,
        prompt_user=prompt_user,
    )
