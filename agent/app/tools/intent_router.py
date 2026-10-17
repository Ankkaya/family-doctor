from __future__ import annotations

import json

from ..llm.provider import LLMProvider
from ..llm.messages import conversation_history
from ..prompting import load_prompt
from ..schemas import ConsultRequest, IntentDecision, TraceStep
from ..tracing import trace_node

INTENT_ROUTER_PROMPT_KEY = "intent_router.system"
INTENT_ROUTER_PROMPT_VERSION = "v1"
INTENT_ROUTER_SYSTEM = load_prompt("intent_router.system.v1.md")
LOW_CONFIDENCE_THRESHOLD = 0.7

MEDICINE_CONSULT_INTENTS = {"medicine_consult", "medicine_search"}
async def classify_intent(
    *,
    llm: LLMProvider,
    payload: ConsultRequest,
) -> tuple[IntentDecision, TraceStep | None]:
    history = conversation_history(payload.history_messages or payload.history)
    user_prompt = json.dumps(
        {
            "question": payload.question,
            "medicines": [
                {
                    "id": medicine.id,
                    "name": medicine.name,
                    "otc": medicine.otc,
                    "indication": medicine.indication,
                }
                for medicine in payload.medicines
            ],
            "members": [
                {
                    "id": member.id,
                    "displayName": member.display_name,
                    "role": member.role,
                }
                for member in payload.members
            ],
            "sessionSummary": (
                payload.session_summary.model_dump(by_alias=True)
                if payload.session_summary
                else None
            ),
        },
        ensure_ascii=False,
    )
    with trace_node(
        "intent_router",
        {
            "question": payload.question,
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
            decision = IntentDecision(
                intent="unsupported",
                confidence=0,
                taskType="other",
                needsClarification=True,
                missingFields=["任务类型"],
                reason="LLM 路由失败，需要用户补充任务类型。",
            )
            rec.set_output(
                {
                    "error": str(exc),
                    "decision": decision.model_dump(by_alias=True),
                }
            )
            rec.set_llm(model=llm.model)
    return decision, rec.step



def should_run_consult_graph(decision: IntentDecision) -> bool:
    return decision.intent in MEDICINE_CONSULT_INTENTS
