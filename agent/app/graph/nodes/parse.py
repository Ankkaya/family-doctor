"""症状结构化节点。LLM structured output。"""
from __future__ import annotations

from typing import Any

from ...llm.provider import LLMProvider
from ...schemas import ParsedSymptoms
from ...tracing import trace_node

PARSE_SYSTEM = (
    "你是症状结构化助手。根据用户描述，抽取以下字段：\n"
    "- symptoms：症状列表\n"
    "- severity：严重程度（mild/moderate/severe/unknown）\n"
    "- duration：持续时间\n"
    "- population_hints：人群提示\n"
    "- emergency：是否为急症（自伤、呼吸困难、意识障碍、大出血、胸痛等）\n"
    "不要编造信息。"
)


def make_parse_node(llm: LLMProvider):
    async def parse(state: dict[str, Any]) -> dict[str, Any]:
        question: str = state.get("normalized_question") or state["question"]
        with trace_node("parse", {"question": question}) as rec:
            parsed = await llm.structured(
                system=PARSE_SYSTEM,
                user=question,
                schema=ParsedSymptoms,
            )
            rec.set_output(parsed.model_dump(by_alias=True))
            rec.set_llm(model=llm.model)
        return {"parsed": parsed, "traces": [rec.step]}

    return parse
