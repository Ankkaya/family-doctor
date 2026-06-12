"""症状结构化节点。LLM structured output。"""
from __future__ import annotations

from typing import Any

from ...llm.provider import LLMProvider
from ...prompting import load_prompt
from ...schemas import ParsedSymptoms
from ...tracing import trace_node

PARSE_PROMPT_KEY = "consult.parse.system"
PARSE_PROMPT_VERSION = "v1"
PARSE_SYSTEM = load_prompt("parse.system.v1.md")


def make_parse_node(llm: LLMProvider):
    async def parse(state: dict[str, Any]) -> dict[str, Any]:
        question: str = state.get("normalized_question") or state["question"]
        with trace_node(
            "parse",
            {
                "question": question,
                "promptKey": PARSE_PROMPT_KEY,
                "promptVersion": PARSE_PROMPT_VERSION,
                "systemPrompt": PARSE_SYSTEM,
                "userPrompt": question,
            },
        ) as rec:
            parsed = await llm.structured(
                system=PARSE_SYSTEM,
                user=question,
                schema=ParsedSymptoms,
            )
            rec.set_output(parsed.model_dump(by_alias=True))
            rec.set_llm(model=llm.model)
        return {"parsed": parsed, "traces": [rec.step]}

    return parse
