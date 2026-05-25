"""节点追踪工具。把每个 LangGraph 节点的 IO + 耗时封装成 TraceStep。"""
from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any

from .schemas import TraceStep


@contextmanager
def trace_node(node_name: str, node_input: dict[str, Any]):
    """使用方式：

    with trace_node("parse", {"question": q}) as rec:
        rec.set_output({"symptoms": [...]})
        rec.set_llm(model="gpt-4o-mini", token_in=123, token_out=45)
    步骤结束后从 rec.step 取 TraceStep。
    """
    rec = _TraceRecorder(node_name=node_name, node_input=node_input)
    try:
        yield rec
    except Exception as exc:  # noqa: BLE001
        rec.error = str(exc)
        raise
    finally:
        rec.finalize()


class _TraceRecorder:
    def __init__(self, node_name: str, node_input: dict[str, Any]) -> None:
        self.node_name = node_name
        self.node_input = node_input
        self.node_output: dict[str, Any] = {}
        self.llm_model: str | None = None
        self.token_in: int | None = None
        self.token_out: int | None = None
        self.error: str | None = None
        self._t0 = time.perf_counter()
        self.step: TraceStep | None = None

    def set_output(self, data: dict[str, Any]) -> None:
        self.node_output = data

    def set_llm(self, *, model: str, token_in: int | None = None, token_out: int | None = None) -> None:
        self.llm_model = model
        self.token_in = token_in
        self.token_out = token_out

    def finalize(self) -> None:
        latency_ms = int((time.perf_counter() - self._t0) * 1000)
        self.step = TraceStep(
            nodeName=self.node_name,
            input=self.node_input,
            output=self.node_output,
            llmModel=self.llm_model,
            tokenIn=self.token_in,
            tokenOut=self.token_out,
            latencyMs=latency_ms,
            error=self.error,
        )
