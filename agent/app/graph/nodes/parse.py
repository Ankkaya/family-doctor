"""症状结构化节点。LLM structured output。"""
from __future__ import annotations

import json
from typing import Any

from ...llm.provider import LLMProvider
from ...prompting import load_prompt
from ...schemas import ParsedSymptoms
from ...tracing import trace_node
from ..context import dump_conversation_context

PARSE_PROMPT_KEY = "consult.parse.system"
PARSE_PROMPT_VERSION = "v1"
PARSE_SYSTEM = load_prompt("parse.system.v1.md")


def make_parse_node(llm: LLMProvider):
    async def parse(state: dict[str, Any]) -> dict[str, Any]:
        original_question: str = state["question"]
        normalized_question: str = state.get("normalized_question") or original_question
        user_prompt = json.dumps(
            {
                "instruction": (
                    "请以 originalQuestion 为准理解用户真实描述，normalizedQuestion 仅作为格式规范化参考。"
                    "如果用户使用“这个药、刚才、还能、饭前饭后”等追问表达，必须结合 conversationContext 理解省略信息。"
                ),
                "originalQuestion": original_question,
                "normalizedQuestion": normalized_question,
                "conversationContext": dump_conversation_context(state),
            },
            ensure_ascii=False,
        )
        with trace_node(
            "parse",
            {
                "question": original_question,
                "normalizedQuestion": normalized_question,
                "promptKey": PARSE_PROMPT_KEY,
                "promptVersion": PARSE_PROMPT_VERSION,
                "systemPrompt": PARSE_SYSTEM,
                "userPrompt": user_prompt,
            },
        ) as rec:
            parsed = await llm.structured(
                system=PARSE_SYSTEM,
                user=user_prompt,
                schema=ParsedSymptoms,
            )
            rec.set_output(parsed.model_dump(by_alias=True))
            rec.set_llm(model=llm.model)
        return {"parsed": parsed, "traces": [rec.step]}

    return parse
