"""输入预处理节点。只做低风险文本规范化，不承担症状语义理解。"""
from __future__ import annotations

import re
from typing import Any

from ...tracing import trace_node

FULLWIDTH_TRANSLATION = str.maketrans({
    "０": "0",
    "１": "1",
    "２": "2",
    "３": "3",
    "４": "4",
    "５": "5",
    "６": "6",
    "７": "7",
    "８": "8",
    "９": "9",
    "．": ".",
    "，": ",",
    "。": ".",
    "？": "?",
    "！": "!",
    "：": ":",
    "；": ";",
    "（": "(",
    "）": ")",
})

TIME_TERMS = {
    "半天": "0.5天",
    "一天": "1天",
    "一日": "1天",
    "两天": "2天",
    "二天": "2天",
    "三天": "3天",
    "一周": "1周",
    "两周": "2周",
    "二周": "2周",
    "三周": "3周",
}


def _record_change(changes: list[dict[str, str]], change_type: str, source: str, target: str) -> None:
    if source != target:
        changes.append({"type": change_type, "from": source, "to": target})


def _normalize_temperature(text: str, changes: list[dict[str, str]]) -> str:
    def replace_decimal(match: re.Match[str]) -> str:
        source = match.group(0)
        target = f"{match.group(1)}.{match.group(2)}℃"
        _record_change(changes, "temperature", source, target)
        return target

    def replace_integer(match: re.Match[str]) -> str:
        source = match.group(0)
        target = f"{match.group(1)}℃"
        _record_change(changes, "temperature", source, target)
        return target

    normalized = re.sub(r"(\d{2})\s*度\s*(\d)", replace_decimal, text)
    return re.sub(r"(\d{2})\s*度(?!\d)", replace_integer, normalized)


def _normalize_time_terms(text: str, changes: list[dict[str, str]]) -> str:
    normalized = text
    for source, target in TIME_TERMS.items():
        if source in normalized:
            normalized = normalized.replace(source, target)
            _record_change(changes, "duration", source, target)
    return normalized


def _normalize_text(text: str) -> tuple[str, list[dict[str, str]]]:
    changes: list[dict[str, str]] = []
    normalized = text.strip()
    _record_change(changes, "trim", text, normalized)

    translated = normalized.translate(FULLWIDTH_TRANSLATION)
    _record_change(changes, "fullwidth", normalized, translated)
    normalized = translated

    normalized = _normalize_temperature(normalized, changes)
    normalized = _normalize_time_terms(normalized, changes)
    collapsed = re.sub(r"\s+", " ", normalized).strip()
    _record_change(changes, "whitespace", normalized, collapsed)
    return collapsed, changes


def make_preprocess_node():
    async def preprocess(state: dict[str, Any]) -> dict[str, Any]:
        question: str = state["question"]
        with trace_node("preprocess", {"question": question}) as rec:
            normalized_question, changes = _normalize_text(question)
            rec.set_output({
                "originalQuestion": question,
                "normalizedQuestion": normalized_question,
                "changes": changes,
            })
        return {"normalized_question": normalized_question, "traces": [rec.step]}

    return preprocess
