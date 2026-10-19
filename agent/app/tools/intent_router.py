from __future__ import annotations

from collections.abc import Sequence

from ..llm.provider import LLMProvider
from ..llm.messages import conversation_history
from ..prompting import load_prompt
from ..schemas import ConversationMessageBrief, HistoryMessage, IntentDecision, TraceStep
from ..tracing import trace_node

INTENT_ROUTER_PROMPT_KEY = "intent_router.system"
INTENT_ROUTER_PROMPT_VERSION = "v3"
INTENT_ROUTER_SYSTEM = load_prompt("intent_router.system.v3.md")
async def classify_intent(
    *,
    llm: LLMProvider,
    question: str,
    history_messages: Sequence[HistoryMessage | ConversationMessageBrief],
) -> tuple[IntentDecision, TraceStep | None]:
    history = conversation_history(history_messages)
    user_prompt = question
    with trace_node(
        "intent_router",
        {
            "question": question,
            "promptKey": INTENT_ROUTER_PROMPT_KEY,
            "promptVersion": INTENT_ROUTER_PROMPT_VERSION,
            "systemPrompt": INTENT_ROUTER_SYSTEM,
            "userPrompt": user_prompt,
            "historyMessages": history,
        },
    ) as rec:
        try:
            decision = await llm.structured(
                system=INTENT_ROUTER_SYSTEM,
                user=user_prompt,
                schema=IntentDecision,
                history=history,
            )
            rec.set_output(decision.model_dump(by_alias=True))
            rec.set_llm(model=llm.model)
        except Exception as exc:  # noqa: BLE001
            decision = IntentDecision(profile="general", content=question.strip()[:2000] or "请补充你的问题。")
            rec.set_output(
                {
                    "error": str(exc),
                    "decision": decision.model_dump(by_alias=True),
                }
            )
            rec.set_llm(model=llm.model)
    return decision, rec.step



def should_run_consult_graph(decision: IntentDecision) -> bool:
    return decision.profile == "medicine"
