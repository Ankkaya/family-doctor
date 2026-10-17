from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
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

from ..security import require_agent_token
from ag_ui.encoder import EventEncoder

from ..graph.nodes.render import (
    RENDER_PROMPT_KEY,
    RENDER_PROMPT_VERSION,
    RENDER_SYSTEM,
    build_render_plan,
)
from ..schemas import ConsultRequest, ConsultResponse, IntentDecision
from ..tools.intent_router import (
    LOW_CONFIDENCE_THRESHOLD,
    classify_intent,
    should_run_consult_graph,
)
from ..tracing import trace_node
from ..graph.context import history_chat_messages

router = APIRouter(dependencies=[Depends(require_agent_token)])

NODE_STATUS_MESSAGES = {
    "intent_router": "正在判断任务类型",
    "preprocess": "正在整理问题描述",
    "parse": "正在识别症状和持续时间",
    "emergency": "正在检查急症风险",
    "special_population": "正在检查特殊人群风险",
    "match": "正在匹配家庭药箱药品",
    "review": "正在审查药品适配性",
    "safety": "正在进行安全审核",
    "render": "正在组织回复",
    "summarize": "正在更新会话摘要",
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
                    input=payload,
                )
            )
            yield encoder.encode(
                StateDeltaEvent(
                    type=EventType.STATE_DELTA,
                    delta=[
                        {"op": "replace", "path": "/sessionId", "value": consult_payload.session_id},
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
                for chunk in _iter_answer_chunks(routed_response.answer):
                    yield encoder.encode(
                        TextMessageContentEvent(
                            type=EventType.TEXT_MESSAGE_CONTENT,
                            message_id=message_id,
                            delta=chunk,
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
                            "recommends": [_dump_alias(item) for item in routed_response.recommends],
                            "disclaimer": routed_response.disclaimer,
                            "traces": [_dump_alias(item) for item in routed_response.traces],
                        },
                    )
                )
                return

            graph = request.app.state.stream_graph
            llm = request.app.state.llm
            settings = request.app.state.settings
            state: dict[str, Any] = {
                "session_id": consult_payload.session_id,
                "question": consult_payload.question,
                "medicines": consult_payload.medicines,
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

            async for event in start_step("render"):
                yield event
            plan = build_render_plan(state)
            message_id = _message_id(payload)
            yield encoder.encode(
                TextMessageStartEvent(
                    type=EventType.TEXT_MESSAGE_START,
                    message_id=message_id,
                    role="assistant",
                )
            )

            with trace_node(
                "render",
                {
                    "emergency": state["parsed"].emergency,
                    "recommendCount": len(plan.recommends),
                    "riskLevel": state.get("risk_level", "unknown"),
                    "promptKey": RENDER_PROMPT_KEY,
                    "promptVersion": RENDER_PROMPT_VERSION,
                    "streaming": True,
                    "protocol": "ag-ui",
                },
            ) as rec:
                answer_parts: list[str] = []
                if plan.prompt_used and plan.prompt_user:
                    async for chunk in llm.chat_stream(system=RENDER_SYSTEM, user=plan.prompt_user, history=history_chat_messages(state)):
                        answer_parts.append(chunk)
                        yield encoder.encode(
                            TextMessageContentEvent(
                                type=EventType.TEXT_MESSAGE_CONTENT,
                                message_id=message_id,
                                delta=chunk,
                            )
                        )
                else:
                    answer_parts.append(plan.answer or "")
                    for chunk in _iter_answer_chunks(answer_parts[0]):
                        yield encoder.encode(
                            TextMessageContentEvent(
                                type=EventType.TEXT_MESSAGE_CONTENT,
                                message_id=message_id,
                                delta=chunk,
                            )
                        )

                answer = "".join(answer_parts).strip()
                rec.set_output({
                    "answerLength": len(answer),
                    "recommendCount": len(plan.recommends),
                    "promptUsed": plan.prompt_used,
                    "systemPrompt": RENDER_SYSTEM if plan.prompt_used else None,
                    "userPrompt": plan.prompt_user,
                    "historyMessages": history_chat_messages(state) if plan.prompt_used else [],
                })
                rec.set_llm(model=llm.model)

            state.setdefault("traces", [])
            state["traces"].append(rec.step)
            session_summary = _dump_alias(state.get("updated_session_summary"))
            recommends = [_dump_alias(item) for item in plan.recommends]
            traces = [_dump_alias(item) for item in [*route_traces, *state["traces"]] if item is not None]

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
                        {"op": "replace", "path": "/disclaimer", "value": settings.disclaimer},
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
                        "disclaimer": settings.disclaimer,
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
        "medicines": forwarded.get("medicines") or [],
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


def _iter_answer_chunks(answer: str, *, size: int = 12) -> list[str]:
    return [answer[index:index + size] for index in range(0, len(answer), size)]


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
    intent, intent_trace = await classify_intent(llm=request.app.state.llm, payload=payload)
    route_traces = [intent_trace] if intent_trace is not None else []

    if should_run_consult_graph(intent):
        return intent, route_traces, None

    return intent, route_traces, _non_consult_response(
        intent=intent,
        traces=route_traces,
        disclaimer=request.app.state.settings.disclaimer,
    )


def _non_consult_response(
    *,
    intent: IntentDecision,
    traces: list[Any],
    disclaimer: str,
) -> ConsultResponse:
    if intent.intent in {"create_reminder", "modify_reminder", "delete_reminder", "list_reminder"}:
        answer = "定时任务已独立于问药咨询。请到个人中心的定时任务中查看和管理提醒。"
        routed_disclaimer = "定时提醒仅用于辅助记录和提示，不替代医生或药师建议。"
    elif intent.intent == "medicine_entry":
        answer = "我已识别到你想录入药品。请使用药品录入入口上传药盒、说明书或手动填写药品信息。"
        routed_disclaimer = disclaimer
    elif intent.intent == "profile_update":
        answer = "我已识别到你想更新个人或家庭成员资料。请到个人中心完善年龄、过敏史、基础病和长期用药等信息。"
        routed_disclaimer = disclaimer
    elif intent.intent == "smalltalk":
        answer = "你好，我可以帮你做家庭药箱寻药咨询、药品信息查询和用药安全咨询。"
        routed_disclaimer = disclaimer
    elif intent.confidence < LOW_CONFIDENCE_THRESHOLD or intent.needs_clarification:
        missing = (
            f"还需要补充：{'、'.join(intent.missing_fields)}。"
            if intent.missing_fields
            else "请再补充一点目标或时间。"
        )
        answer = f"我还不确定要执行哪类任务。{missing}"
        routed_disclaimer = disclaimer
    else:
        answer = "这个需求暂时超出家庭药箱 Agent 的处理范围。你可以问我家庭药箱寻药、药品信息或用药安全。"
        routed_disclaimer = disclaimer

    return ConsultResponse(
        answer=answer,
        recommends=[],
        disclaimer=routed_disclaimer,
        traces=[trace for trace in traces if trace is not None],
    )


def _status_for_routed_response(intent: IntentDecision) -> str:
    return NODE_STATUS_MESSAGES["intent_router"]
