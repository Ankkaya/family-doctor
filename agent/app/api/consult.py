from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Request
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
from ag_ui.encoder import EventEncoder

from ..graph.nodes.render import (
    RENDER_PROMPT_KEY,
    RENDER_PROMPT_VERSION,
    RENDER_SYSTEM,
    build_render_plan,
)
from ..schemas import ConsultRequest, ConsultResponse
from ..tools.cron_job_tool import (
    CronJobTool,
    build_idempotency_key,
    build_plan_from_text,
    confirmation_text,
    is_confirmation,
    is_reminder_intent,
    is_supported_reminder,
    missing_fields_text,
)
from ..tracing import trace_node
from ..tracing import trace_node

router = APIRouter()

NODE_STATUS_MESSAGES = {
    "preprocess": "正在整理问题描述",
    "parse": "正在识别症状和持续时间",
    "emergency": "正在检查急症风险",
    "special_population": "正在检查特殊人群风险",
    "match": "正在匹配家庭药箱药品",
    "review": "正在审查药品适配性",
    "safety": "正在进行安全审核",
    "render": "正在组织回复",
}


@router.post("/consult", response_model=ConsultResponse, response_model_by_alias=True)
async def consult(payload: ConsultRequest, request: Request) -> ConsultResponse:
    reminder_response = await _try_handle_reminder(payload, request)
    if reminder_response:
        return reminder_response

    graph = request.app.state.graph
    result = await graph.ainvoke(
        {
            "session_id": payload.session_id,
            "question": payload.question,
            "medicines": payload.medicines,
            "user_profile": payload.user_profile,
            "allow_rx_recommendation": payload.allow_rx_recommendation,
            "traces": [],
        }
    )
    return ConsultResponse(
        answer=result["answer"],
        recommends=result["recommends"],
        disclaimer=result["disclaimer"],
        traces=[trace for trace in result["traces"] if trace is not None],
    )


@router.post("/consult/stream")
async def consult_stream(payload: ConsultRequest, request: Request) -> StreamingResponse:
    reminder_response = await _try_handle_reminder(payload, request)
    if reminder_response:
        async def reminder_events() -> AsyncIterator[str]:
            yield _to_ndjson(
                {
                    "type": "status",
                    "stage": "agent",
                    "message": "正在处理定时任务",
                }
            )
            for chunk in _iter_answer_chunks(reminder_response.answer):
                yield _to_ndjson({"type": "answer_delta", "delta": chunk})
            yield _to_ndjson(
                {
                    "type": "complete",
                    **reminder_response.model_dump(by_alias=True),
                }
            )

        return StreamingResponse(reminder_events(), media_type="application/x-ndjson")

    graph = request.app.state.stream_graph
    llm = request.app.state.llm
    settings = request.app.state.settings

    async def events() -> AsyncIterator[str]:
        state: dict[str, Any] = {
            "session_id": payload.session_id,
            "question": payload.question,
            "medicines": payload.medicines,
            "user_profile": payload.user_profile,
            "allow_rx_recommendation": payload.allow_rx_recommendation,
            "traces": [],
        }

        yield _to_ndjson(
            {
                "type": "status",
                "stage": "agent",
                "message": "正在启动问诊 Agent",
            }
        )

        async for update in graph.astream(state, stream_mode="updates"):
            for node_name, node_update in update.items():
                if not isinstance(node_update, dict):
                    continue

                _merge_state(state, node_update)
                yield _to_ndjson(
                    {
                        "type": "status",
                        "stage": "agent",
                        "message": NODE_STATUS_MESSAGES.get(node_name, f"正在执行 {node_name}"),
                    }
                )

        yield _to_ndjson(
            {
                "type": "status",
                "stage": "agent",
                "message": NODE_STATUS_MESSAGES["render"],
            }
        )

        plan = build_render_plan(state)
        with trace_node(
            "render",
            {
                "emergency": state["parsed"].emergency,
                "recommendCount": len(plan.recommends),
                "riskLevel": state.get("risk_level", "unknown"),
                "promptKey": RENDER_PROMPT_KEY,
                "promptVersion": RENDER_PROMPT_VERSION,
                "streaming": True,
            },
        ) as rec:
            answer_parts: list[str] = []

            if plan.prompt_used and plan.prompt_user:
                async for chunk in llm.chat_stream(system=RENDER_SYSTEM, user=plan.prompt_user):
                    answer_parts.append(chunk)
                    yield _to_ndjson(
                        {
                            "type": "answer_delta",
                            "delta": chunk,
                        }
                    )
            else:
                answer_parts.append(plan.answer or "")
                for chunk in _iter_answer_chunks(answer_parts[0]):
                    yield _to_ndjson(
                        {
                            "type": "answer_delta",
                            "delta": chunk,
                        }
                    )

            answer = "".join(answer_parts).strip()
            rec.set_output({
                "answerLength": len(answer),
                "recommendCount": len(plan.recommends),
                "promptUsed": plan.prompt_used,
                "systemPrompt": RENDER_SYSTEM if plan.prompt_used else None,
                "userPrompt": plan.prompt_user,
            })
            rec.set_llm(model=llm.model)
        state.setdefault("traces", [])
        state["traces"].append(rec.step)

        output = ConsultResponse(
            answer=answer,
            recommends=plan.recommends,
            disclaimer=settings.disclaimer,
            traces=state["traces"],
        )
        yield _to_ndjson(
            {
                "type": "complete",
                **output.model_dump(by_alias=True),
            }
        )

    return StreamingResponse(events(), media_type="application/x-ndjson")


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

            reminder_response = await _try_handle_reminder(consult_payload, request)
            if reminder_response:
                message_id = _message_id(payload)
                yield encoder.encode(
                    CustomEvent(
                        type=EventType.CUSTOM,
                        name="consultation.status",
                        value={"stage": "agent", "message": "正在处理定时任务"},
                    )
                )
                yield encoder.encode(
                    TextMessageStartEvent(
                        type=EventType.TEXT_MESSAGE_START,
                        message_id=message_id,
                        role="assistant",
                    )
                )
                for chunk in _iter_answer_chunks(reminder_response.answer):
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
                            {"op": "replace", "path": "/answer", "value": reminder_response.answer},
                            {
                                "op": "replace",
                                "path": "/recommends",
                                "value": [
                                    _dump_alias(item)
                                    for item in reminder_response.recommends
                                ],
                            },
                            {
                                "op": "replace",
                                "path": "/disclaimer",
                                "value": reminder_response.disclaimer,
                            },
                            {
                                "op": "replace",
                                "path": "/traces",
                                "value": [
                                    _dump_alias(item)
                                    for item in reminder_response.traces
                                ],
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
                            "answer": reminder_response.answer,
                            "recommends": [
                                _dump_alias(item)
                                for item in reminder_response.recommends
                            ],
                            "disclaimer": reminder_response.disclaimer,
                            "traces": [
                                _dump_alias(item)
                                for item in reminder_response.traces
                            ],
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
                "allow_rx_recommendation": consult_payload.allow_rx_recommendation,
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
                    async for chunk in llm.chat_stream(system=RENDER_SYSTEM, user=plan.prompt_user):
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
                })
                rec.set_llm(model=llm.model)

            state.setdefault("traces", [])
            state["traces"].append(rec.step)
            recommends = [_dump_alias(item) for item in plan.recommends]
            traces = [_dump_alias(item) for item in state["traces"] if item is not None]

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


def _to_ndjson(event: dict[str, Any]) -> str:
    return f"{json.dumps(event, ensure_ascii=False)}\n"


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


async def _try_handle_reminder(payload: ConsultRequest, request: Request) -> ConsultResponse | None:
    question = payload.question.strip()
    previous_confirmation = _find_previous_confirmation(payload)
    if is_confirmation(question) and previous_confirmation:
        answer = ""
        traces: list[Any] = []
        with trace_node(
            "cron_job_execute",
            {
                "question": question,
                "previousConfirmation": previous_confirmation,
                "sessionId": payload.session_id,
            },
        ) as rec:
            plan = build_plan_from_text(
                text=previous_confirmation,
                medicines=payload.medicines,
                members=payload.members,
                session_id=payload.session_id,
                user_id=payload.user_id,
                household_id=payload.household_id,
                now=payload.now,
                timezone_name=payload.timezone,
            )
            if plan.missing_fields:
                answer = missing_fields_text(plan.missing_fields)
                rec.set_output({"created": False, "missingFields": plan.missing_fields})
            elif not payload.household_id:
                answer = "当前家庭信息缺失，暂时无法创建定时任务。"
                rec.set_output({"created": False, "reason": "missing_household_id"})
            else:
                tool = CronJobTool(request.app.state.settings)
                idempotency_key = build_idempotency_key(payload.session_id, payload.user_id, plan)
                try:
                    result = await tool.create_job(
                        plan=plan,
                        user_id=payload.user_id,
                        household_id=payload.household_id,
                        idempotency_key=idempotency_key,
                    )
                except Exception as exc:  # noqa: BLE001
                    answer = f"定时任务创建失败：{exc}"
                    rec.set_output({"created": False, "error": str(exc)})
                else:
                    rec.set_output({"created": True, "jobId": result.get("id"), "taskType": plan.task_type})
                    answer = f"已设置：{result.get('title', plan.title)}。你可以在个人中心的定时任务中查看和管理。"
            pass
        traces = [rec.step]
        return _reminder_response(answer=answer, traces=traces)

    if not is_reminder_intent(question, payload.medicines):
        return None

    answer = ""
    traces: list[Any] = []
    with trace_node(
        "cron_job_plan",
        {
            "question": question,
            "sessionId": payload.session_id,
            "medicineCount": len(payload.medicines),
            "memberCount": len(payload.members),
        },
    ) as rec:
        if not is_supported_reminder(question, payload.medicines):
            answer = "我只能设置家庭药箱相关提醒，比如吃药、量体温、药品过期或库存提醒。"
            rec.set_output({"allowed": False, "reason": "out_of_scope"})
        else:
            plan = build_plan_from_text(
                text=question,
                medicines=payload.medicines,
                members=payload.members,
                session_id=payload.session_id,
                user_id=payload.user_id,
                household_id=payload.household_id,
                now=payload.now,
                timezone_name=payload.timezone,
            )
            if plan.missing_fields:
                answer = missing_fields_text(plan.missing_fields)
                rec.set_output({"allowed": True, "complete": False, "missingFields": plan.missing_fields})
            else:
                answer = confirmation_text(plan)
                rec.set_output(
                    {
                        "allowed": True,
                        "complete": True,
                        "taskType": plan.task_type,
                        "scheduleType": plan.schedule_type,
                        "medicineId": plan.medicine_id,
                        "times": plan.times,
                        "runAt": plan.run_at,
                        "everySeconds": plan.every_seconds,
                    }
                )
        pass
    traces = [rec.step]
    return _reminder_response(answer=answer, traces=traces)


def _find_previous_confirmation(payload: ConsultRequest) -> str | None:
    for message in reversed(payload.history or []):
        if message.role == "ASSISTANT" and "请确认：" in message.content and "回复“确认”" in message.content:
            return message.content
    return None


def _reminder_response(*, answer: str, traces: list[Any]) -> ConsultResponse:
    return ConsultResponse(
        answer=answer,
        recommends=[],
        disclaimer="定时提醒仅用于辅助记录和提示，不替代医生或药师建议。",
        traces=[trace for trace in traces if trace is not None],
    )
