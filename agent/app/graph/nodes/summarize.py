"""更新会话摘要，供长对话后续轮次压缩使用。"""
from __future__ import annotations

from typing import Any

from ...schemas import MedicineBrief, ParsedSymptoms, Recommend, SessionSummary
from ...tracing import trace_node
from ..context import merge_unique


def make_summarize_node():
    async def summarize(state: dict[str, Any]) -> dict[str, Any]:
        existing: SessionSummary | None = state.get("session_summary")
        parsed: ParsedSymptoms = state["parsed"]
        recommends: list[Recommend] = state.get("recommends") or []
        decisions: list[dict[str, Any]] = state.get("review_decisions") or []
        candidates: list[MedicineBrief] = state.get("candidates") or []
        flags: list[str] = state.get("special_population_flags") or []
        question = state.get("normalized_question") or state.get("question") or ""

        with trace_node(
            "summarize",
            {
                "hasExistingSummary": existing is not None,
                "symptoms": parsed.symptoms,
                "recommendCount": len(recommends),
            },
        ) as rec:
            recommended_names = [item.name for item in recommends]
            rejected_names = [
                str(item.get("name"))
                for item in decisions
                if item.get("name") and not item.get("suitable")
            ]
            mentioned_names = merge_unique(
                [medicine.name for medicine in candidates],
                recommended_names,
                rejected_names,
            )
            temporary_facts = extract_temporary_user_facts(question)
            unresolved = [] if parsed.emergency or recommends or decisions else ["需要补充症状细节或就医咨询"]
            suggested_status = "resolved" if parsed.emergency or recommends or not unresolved else "active"

            updated = SessionSummary(
                chiefComplaint=build_chief_complaint(parsed, existing),
                symptoms=merge_unique(existing.symptoms if existing else [], parsed.symptoms),
                duration=parsed.duration or (existing.duration if existing else None),
                riskFlags=merge_unique(existing.risk_flags if existing else [], flags),
                mentionedMedicines=merge_unique(existing.mentioned_medicines if existing else [], mentioned_names),
                rejectedMedicines=merge_unique(existing.rejected_medicines if existing else [], rejected_names),
                recommendedMedicines=merge_unique(
                    existing.recommended_medicines if existing else [],
                    recommended_names,
                ),
                temporaryUserFacts=merge_unique(
                    existing.temporary_user_facts if existing else [],
                    temporary_facts,
                ),
                unresolvedQuestions=unresolved,
                lastTopic=", ".join(parsed.symptoms) if parsed.symptoms else question[:40],
                suggestedStatus=suggested_status,
            )
            rec.set_output(updated.model_dump(by_alias=True))

        return {"updated_session_summary": updated, "traces": [rec.step]}

    return summarize


def build_chief_complaint(parsed: ParsedSymptoms, existing: SessionSummary | None) -> str | None:
    if parsed.symptoms:
        return "、".join(parsed.symptoms)
    return existing.chief_complaint if existing else None


def extract_temporary_user_facts(question: str) -> list[str]:
    facts: list[str] = []
    for keyword in ["过敏", "高血压", "糖尿病", "孕", "怀孕", "哺乳", "肝", "肾", "儿童", "老人"]:
        if keyword in question:
            facts.append(question[:80])
            break
    return facts
