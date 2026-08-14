"""急症规则判断节点。命中后后续节点不再产生推荐。"""
from __future__ import annotations

from typing import Any

from ...schemas import ParsedSymptoms
from ...tracing import trace_node

EMERGENCY_KEYWORDS = {
    "自杀": "自伤/自杀风险",
    "自伤": "自伤/自杀风险",
    "呼吸困难": "呼吸困难",
    "喘不上气": "呼吸困难",
    "意识不清": "意识障碍",
    "昏迷": "意识障碍",
    "胸痛": "胸痛",
    "大出血": "大出血",
    "抽搐": "抽搐",
    "严重过敏": "严重过敏",
    "喉头水肿": "喉头水肿",
    "呕血": "消化道出血信号",
    "便血": "消化道出血信号",
    "休克": "休克",
    "无法呼吸": "呼吸困难",
    "嘴唇发紫": "缺氧信号",
    "心梗": "疑似心肌梗死",
    "偏瘫": "疑似卒中",
    "说话不清": "疑似卒中",
    "高热惊厥": "高热惊厥",
}


def make_emergency_node():
    async def emergency(state: dict[str, Any]) -> dict[str, Any]:
        question = state.get("normalized_question") or state["question"]
        parsed: ParsedSymptoms = state["parsed"]
        with trace_node("emergency", {"question": question, "parsedEmergency": parsed.emergency}) as rec:
            reasons = [reason for keyword, reason in EMERGENCY_KEYWORDS.items() if keyword in question]
            is_emergency = parsed.emergency or bool(reasons)
            rec.set_output({"emergency": is_emergency, "reasons": reasons})
        return {
            "emergency": is_emergency,
            "emergency_reasons": reasons,
            "parsed": parsed.model_copy(update={"emergency": is_emergency}),
            "traces": [rec.step],
        }

    return emergency
