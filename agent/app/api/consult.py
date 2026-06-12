from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from ..schemas import ConsultRequest, ConsultResponse

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
    graph = request.app.state.graph

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

        output = ConsultResponse(
            answer=state["answer"],
            recommends=state["recommends"],
            disclaimer=state["disclaimer"],
            traces=state["traces"],
        )
        for chunk in _iter_answer_chunks(output.answer):
            yield _to_ndjson(
                {
                    "type": "answer_delta",
                    "delta": chunk,
                }
            )
        yield _to_ndjson(
            {
                "type": "complete",
                **output.model_dump(by_alias=True),
            }
        )

    return StreamingResponse(events(), media_type="application/x-ndjson")


def _to_ndjson(event: dict[str, Any]) -> str:
    return f"{json.dumps(event, ensure_ascii=False)}\n"


def _iter_answer_chunks(answer: str, *, size: int = 12) -> list[str]:
    return [answer[index:index + size] for index in range(0, len(answer), size)]


def _merge_state(state: dict[str, Any], update: dict[str, Any]) -> None:
    for key, value in update.items():
        if key == "traces":
            state.setdefault("traces", [])
            state["traces"].extend(item for item in value if item is not None)
            continue

        state[key] = value
