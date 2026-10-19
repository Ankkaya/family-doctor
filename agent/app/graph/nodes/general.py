from __future__ import annotations

import json

from ...llm.messages import conversation_history
from ...llm.provider import LLMProvider
from ...prompting import load_prompt
from ...schemas import ConsultRequest, IntentDecision
from ...tracing import trace_node

GENERAL_SYSTEM = load_prompt("general.system.v2.md")


async def generate_general_reply(
    *, llm: LLMProvider, payload: ConsultRequest, intent: IntentDecision
):
    history = conversation_history(payload.history_messages or payload.history)
    user = json.dumps(
        {"originalQuestion": payload.question, "resolvedQuestion": intent.content},
        ensure_ascii=False,
    )
    with trace_node(
        "general_reply",
        {
            "promptKey": "consult.general.system",
            "promptVersion": "v2",
            "systemPrompt": GENERAL_SYSTEM,
            "userPrompt": user,
            "historyMessages": history,
        },
    ) as rec:
        answer = (await llm.chat(system=GENERAL_SYSTEM, user=user, history=history)).strip()
        if not answer:
            raise ValueError("general 模型返回空回答")
        rec.set_output({"answer": answer})
        rec.set_llm(model=llm.model)
    return answer, rec.step
