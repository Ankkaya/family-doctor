from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from ag_ui.core import (
    CustomEvent,
    EventType,
    RunAgentInput,
    RunErrorEvent,
    RunFinishedEvent,
    RunStartedEvent,
    StateDeltaEvent,
    StepFinishedEvent,
    StepStartedEvent,
    TextMessageContentEvent,
    TextMessageEndEvent,
    TextMessageStartEvent,
)
from ag_ui.encoder import EventEncoder
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ..graph.nodes.general import generate_general_reply
from ..schemas import ConsultRequest, ConsultResponse, IntentDecision
from ..security import require_agent_token
from ..tools.intent_router import (
    classify_intent,
    should_run_consult_graph,
)

router = APIRouter(dependencies=[Depends(require_agent_token)])

NODE_STATUS_MESSAGES = {
    "intent_router": "正在判断任务类型",
    "general_reply": "正在生成交流回复",
    "medicine": "正在查询药品并生成回复",
    "medicine_lookup": "正在查询家庭药箱",
    "retrieval_evaluation": "正在评估查询结果并按需重写",
}


@router.post("/ag-ui")
async def ag_ui(payload: RunAgentInput, request: Request) -> StreamingResponse:
    encoder = EventEncoder(accept=request.headers.get("accept"))
    consult_payload = _run_input_to_consult_request(payload)

    async def events() -> AsyncIterator[str]:
        try:
            yield encoder.encode(
                RunStartedEvent(
                    type=EventType.RUN_STARTED,
                    thread_id=payload.thread_id,
                    run_id=payload.run_id,
                    parent_run_id=payload.parent_run_id,
                )
            )
            yield encoder.encode(
                StateDeltaEvent(
                    type=EventType.STATE_DELTA,
                    delta=[
                        {
                            "op": "replace",
                            "path": "/sessionId",
                            "value": consult_payload.session_id,
                        },
                    ],
                )
            )

            intent, route_traces, routed_response = await _route_request(consult_payload, request)
            if routed_response:
                message_id = _message_id(payload)
                yield encoder.encode(
                    CustomEvent(
                        type=EventType.CUSTOM,
                        name="consultation.status",
                        value={"stage": "agent", "message": _status_for_routed_response(intent)},
                    )
                )
                yield encoder.encode(
                    TextMessageStartEvent(
                        type=EventType.TEXT_MESSAGE_START,
                        message_id=message_id,
                        role="assistant",
                    )
                )
                yield encoder.encode(
                    TextMessageContentEvent(
                        type=EventType.TEXT_MESSAGE_CONTENT,
                        message_id=message_id,
                        delta=routed_response.answer,
                    )
                )
                yield encoder.encode(
                    TextMessageEndEvent(
                        type=EventType.TEXT_MESSAGE_END,
                        message_id=message_id,
                    )
                )
                yield encoder.encode(
                    StateDeltaEvent(
                        type=EventType.STATE_DELTA,
                        delta=[
                            {"op": "replace", "path": "/messageId", "value": message_id},
                            {"op": "replace", "path": "/answer", "value": routed_response.answer},
                            {
                                "op": "replace",
                                "path": "/recommends",
                                "value": [_dump_alias(item) for item in routed_response.recommends],
                            },
                            {
                                "op": "replace",
                                "path": "/disclaimer",
                                "value": routed_response.disclaimer,
                            },
                            {
                                "op": "replace",
                                "path": "/traces",
                                "value": [_dump_alias(item) for item in routed_response.traces],
                            },
                            {
                                "op": "replace",
                                "path": "/sessionSummary",
                                "value": _dump_alias(routed_response.session_summary),
                            },
                        ],
                    )
                )
                yield encoder.encode(
                    RunFinishedEvent(
                        type=EventType.RUN_FINISHED,
                        thread_id=payload.thread_id,
                        run_id=payload.run_id,
                        result={
                            "sessionId": consult_payload.session_id,
                            "messageId": message_id,
                            "answer": routed_response.answer,
                            "recommends": [
                                _dump_alias(item) for item in routed_response.recommends
                            ],
                            "disclaimer": routed_response.disclaimer,
                            "traces": [_dump_alias(item) for item in routed_response.traces],
                            "sessionSummary": _dump_alias(routed_response.session_summary),
                        },
                    )
                )
                return

            graph = request.app.state.stream_graph
            state: dict[str, Any] = {
                "session_id": consult_payload.session_id,
                "question": consult_payload.question,
                "resolved_question": intent.content,
                "medicines": [],
                "cabinet_scope": consult_payload.cabinet_scope,
                "user_profile": consult_payload.user_profile,
                "history_messages": consult_payload.history_messages,
                "session_summary": consult_payload.session_summary,
                "conversation_status": consult_payload.conversation_status,
                "allow_rx_recommendation": consult_payload.allow_rx_recommendation,
                "intent_decision": intent,
                "traces": [],
            }

            active_step: str | None = None

            async def start_step(step_name: str) -> AsyncIterator[str]:
                nonlocal active_step
                if active_step == step_name:
                    return
                if active_step:
                    yield encoder.encode(
                        StepFinishedEvent(type=EventType.STEP_FINISHED, step_name=active_step)
                    )
                active_step = step_name
                yield encoder.encode(
                    StepStartedEvent(type=EventType.STEP_STARTED, step_name=step_name)
                )

            async for event in start_step("agent"):
                yield event
            yield encoder.encode(
                CustomEvent(
                    type=EventType.CUSTOM,
                    name="consultation.status",
                    value={"stage": "agent", "message": "正在启动问诊 Agent"},
                )
            )

            async for update in graph.astream(state, stream_mode="updates"):
                for node_name, node_update in update.items():
                    if not isinstance(node_update, dict):
                        continue

                    _merge_state(state, node_update)
                    async for event in start_step(node_name):
                        yield event
                    yield encoder.encode(
                        CustomEvent(
                            type=EventType.CUSTOM,
                            name="consultation.status",
                            value={
                                "stage": "agent",
                                "message": NODE_STATUS_MESSAGES.get(
                                    node_name,
                                    f"正在执行 {node_name}",
                                ),
                            },
                        )
                    )

            message_id = _message_id(payload)
            answer = state["answer"]
            yield encoder.encode(
                TextMessageStartEvent(
                    type=EventType.TEXT_MESSAGE_START, message_id=message_id, role="assistant"
                )
            )
            yield encoder.encode(
                TextMessageContentEvent(
                    type=EventType.TEXT_MESSAGE_CONTENT, message_id=message_id, delta=answer
                )
            )
            session_summary = _dump_alias(state.get("updated_session_summary"))
            recommends = [_dump_alias(item) for item in state.get("recommends", [])]
            traces = [
                _dump_alias(item) for item in [*route_traces, *state["traces"]] if item is not None
            ]

            if active_step:
                yield encoder.encode(
                    StepFinishedEvent(type=EventType.STEP_FINISHED, step_name=active_step)
                )
            yield encoder.encode(
                TextMessageEndEvent(
                    type=EventType.TEXT_MESSAGE_END,
                    message_id=message_id,
                )
            )
            yield encoder.encode(
                StateDeltaEvent(
                    type=EventType.STATE_DELTA,
                    delta=[
                        {"op": "replace", "path": "/messageId", "value": message_id},
                        {"op": "replace", "path": "/answer", "value": answer},
                        {"op": "replace", "path": "/recommends", "value": recommends},
                        {
                            "op": "replace",
                            "path": "/disclaimer",
                            "value": request.app.state.settings.disclaimer,
                        },
                        {"op": "replace", "path": "/traces", "value": traces},
                        {"op": "replace", "path": "/sessionSummary", "value": session_summary},
                    ],
                )
            )
            yield encoder.encode(
                RunFinishedEvent(
                    type=EventType.RUN_FINISHED,
                    thread_id=payload.thread_id,
                    run_id=payload.run_id,
                    result={
                        "sessionId": consult_payload.session_id,
                        "messageId": message_id,
                        "answer": answer,
                        "recommends": recommends,
                        "disclaimer": request.app.state.settings.disclaimer,
                        "traces": traces,
                        "sessionSummary": session_summary,
                    },
                )
            )
        except Exception as exc:  # noqa: BLE001
            yield encoder.encode(
                RunErrorEvent(
                    type=EventType.RUN_ERROR,
                    message=str(exc),
                    code="AG_UI_AGENT_ERROR",
                )
            )

    return StreamingResponse(events(), media_type=encoder.get_content_type())


def _run_input_to_consult_request(payload: RunAgentInput) -> ConsultRequest:
    forwarded = payload.forwarded_props if isinstance(payload.forwarded_props, dict) else {}
    state = payload.state if isinstance(payload.state, dict) else {}
    question = (
        _latest_user_text(payload)
        or _string_value(forwarded.get("question"))
        or _string_value(state.get("question"))
    )
    if not question:
        raise ValueError("AG-UI input is missing a user question")

    session_id = (
        _string_value(forwarded.get("sessionId"))
        or _string_value(state.get("sessionId"))
        or payload.thread_id
    )
    data = {
        "sessionId": session_id,
        "question": question,
        "userId": forwarded.get("userId"),
        "householdId": forwarded.get("householdId"),
        "medicines": [],
        "cabinetScope": forwarded.get("cabinetScope"),
        "members": forwarded.get("members") or [],
        "history": forwarded.get("history") or [],
        "userProfile": forwarded.get("userProfile"),
        "historyMessages": (forwarded.get("historyMessages") or [])[-10:],
        "sessionSummary": forwarded.get("sessionSummary"),
        "conversationStatus": forwarded.get("conversationStatus") or "active",
        "allowRxRecommendation": bool(
            forwarded.get("allowRxRecommendation")
            if "allowRxRecommendation" in forwarded
            else state.get("allowRxRecommendation", False)
        ),
        "timezone": forwarded.get("timezone") or "Asia/Shanghai",
        "now": forwarded.get("now"),
    }
    return ConsultRequest.model_validate(data)


def _latest_user_text(payload: RunAgentInput) -> str | None:
    for message in reversed(payload.messages):
        role = getattr(getattr(message, "role", None), "value", getattr(message, "role", None))
        if role != "user":
            continue

        return _message_text(getattr(message, "content", None))

    return None


def _message_text(content: Any) -> str | None:
    if isinstance(content, str):
        return content.strip() or None

    if isinstance(content, list):
        text = "".join(
            part if isinstance(part, str) else str(getattr(part, "text", "") or "")
            for part in content
        ).strip()
        return text or None

    return None


def _string_value(value: Any) -> str | None:
    return value.strip() if isinstance(value, str) and value.strip() else None


def _message_id(payload: RunAgentInput) -> str:
    forwarded = payload.forwarded_props if isinstance(payload.forwarded_props, dict) else {}
    state = payload.state if isinstance(payload.state, dict) else {}
    return (
        _string_value(forwarded.get("messageId"))
        or _string_value(state.get("messageId"))
        or str(uuid.uuid4())
    )


def _dump_alias(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(by_alias=True)
    return value


def _merge_state(state: dict[str, Any], update: dict[str, Any]) -> None:
    for key, value in update.items():
        if key == "traces":
            state.setdefault("traces", [])
            state["traces"].extend(item for item in value if item is not None)
            continue

        state[key] = value


async def _route_request(
    payload: ConsultRequest,
    request: Request,
) -> tuple[IntentDecision, list[Any], ConsultResponse | None]:
    intent, intent_trace = await classify_intent(
        llm=request.app.state.llm,
        question=payload.question,
        history_messages=payload.history_messages or payload.history,
    )
    route_traces = [intent_trace] if intent_trace is not None else []

    if should_run_consult_graph(intent):
        return intent, route_traces, None

    reply, reply_trace = await generate_general_reply(
        llm=request.app.state.llm, payload=payload, intent=intent
    )
    route_traces.append(reply_trace)
    return (
        intent,
        route_traces,
        ConsultResponse(
            answer=reply,
            recommends=[],
            disclaimer=request.app.state.settings.disclaimer,
            session_summary=payload.session_summary,
            traces=[trace for trace in route_traces if trace is not None],
        ),
    )


def _status_for_routed_response(intent: IntentDecision) -> str:
    return NODE_STATUS_MESSAGES["general_reply"]
