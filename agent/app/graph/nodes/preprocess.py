"""输入预处理节点。规则归一化常见症状和时间/体温表达。"""
from __future__ import annotations

import re
from typing import Any

from ...tracing import trace_node

NORMALIZE_TERMS = {
    "发烧": "发热",
    "嗓子疼": "咽痛",
    "喉咙痛": "咽痛",
    "拉肚子": "腹泻",
    "肚子疼": "腹痛",
}


def _normalize_text(text: str) -> str:
    normalized = text.strip()
    for source, target in NORMALIZE_TERMS.items():
        normalized = normalized.replace(source, target)

    normalized = re.sub(r"(\d{2})度(\d)", r"\1.\2℃", normalized)
    normalized = re.sub(r"(\d{2})度", r"\1℃", normalized)
    normalized = normalized.replace("一天", "1天").replace("两天", "2天").replace("三天", "3天")
    return re.sub(r"\s+", " ", normalized)


def make_preprocess_node():
    async def preprocess(state: dict[str, Any]) -> dict[str, Any]:
        question: str = state["question"]
        with trace_node("preprocess", {"question": question}) as rec:
            normalized_question = _normalize_text(question)
            rec.set_output({"normalizedQuestion": normalized_question})
        return {"normalized_question": normalized_question, "traces": [rec.step]}

    return preprocess
