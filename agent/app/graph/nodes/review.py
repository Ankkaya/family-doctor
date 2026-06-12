"""候选药品适配审查节点。由 LLM 统一判断药品与用户问题是否匹配。"""
from __future__ import annotations

import json
from typing import Any

from ...llm.provider import LLMProvider
from ...prompting import load_prompt
from ...schemas import MedicineBrief, ParsedSymptoms, Recommend, RiskReviewOutput, UserProfile
from ...tools.safety_tools import build_recommendation, normalize_profile_text
from ...tracing import trace_node

REVIEW_PROMPT_KEY = "consult.review.system"
REVIEW_PROMPT_VERSION = "v1"
REVIEW_SYSTEM = load_prompt("review.system.v1.md")


def make_review_node(llm: LLMProvider):
    async def review(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        profile: UserProfile | None = state.get("user_profile")
        candidates: list[MedicineBrief] = state.get("candidates") or []
        flags: list[str] = state.get("special_population_flags") or []
        allow_rx_recommendation = bool(state.get("allow_rx_recommendation"))
        prompt_payload = build_review_prompt(
            question=state.get("normalized_question") or state.get("question") or "",
            parsed=parsed,
            profile=profile,
            flags=flags,
            candidates=candidates,
            allow_rx_recommendation=allow_rx_recommendation,
        )
        with trace_node(
            "review",
            {
                "question": state.get("normalized_question") or state.get("question") or "",
                "symptoms": parsed.symptoms,
                "candidateMedicines": [
                    {
                        "medicineId": medicine.id,
                        "name": medicine.name,
                        "otc": medicine.otc,
                        "indication": medicine.indication,
                    }
                    for medicine in candidates
                ],
                "allowRxRecommendation": allow_rx_recommendation,
                "riskFlags": flags,
                "promptKey": REVIEW_PROMPT_KEY,
                "promptVersion": REVIEW_PROMPT_VERSION,
                "systemPrompt": REVIEW_SYSTEM,
                "userPrompt": prompt_payload,
            },
        ) as rec:
            if not candidates:
                rec.set_output({
                    "recommended": [],
                    "rejected": [],
                    "decisions": [],
                    "reviewed": 0,
                })
                return {"risked": [], "review_decisions": [], "traces": [rec.step]}

            review_output = await llm.structured(
                system=REVIEW_SYSTEM,
                user=prompt_payload,
                schema=RiskReviewOutput,
            )
            risked, decisions = apply_review(
                candidates=candidates,
                parsed=parsed,
                profile=profile,
                flags=flags,
                allow_rx_recommendation=allow_rx_recommendation,
                review=review_output,
            )
            rec.set_output({
                "recommended": [
                    {"medicineId": item.medicine_id, "name": item.name}
                    for item in risked
                ],
                "rejected": [
                    {
                        "medicineId": item["medicineId"],
                        "name": item["name"],
                        "reason": item["rejectReason"],
                    }
                    for item in decisions
                    if not item["suitable"]
                ],
                "decisions": decisions,
                "reviewed": len(review_output.items),
            })
            rec.set_llm(model=llm.model)
        return {"risked": risked, "review_decisions": decisions, "traces": [rec.step]}

    return review


def build_review_prompt(
    *,
    question: str,
    parsed: ParsedSymptoms,
    profile: UserProfile | None,
    flags: list[str],
    candidates: list[MedicineBrief],
    allow_rx_recommendation: bool,
) -> str:
    payload = {
        "question": question,
        "parsedSymptoms": parsed.model_dump(by_alias=True),
        "userProfile": dump_user_profile(profile),
        "riskFlags": flags,
        "allowRxRecommendation": allow_rx_recommendation,
        "candidateMedicines": [
            {
                "medicineId": medicine.id,
                "name": medicine.name,
                "otc": medicine.otc,
                "indication": medicine.indication,
                "contraindication": medicine.contraindication,
                "adverseReaction": medicine.adverse_reaction,
                "dosage": medicine.dosage,
            }
            for medicine in candidates
        ],
    }
    return json.dumps(payload, ensure_ascii=False)


def dump_user_profile(profile: UserProfile | None) -> dict[str, Any] | None:
    if not profile:
        return None

    return {
        "age": profile.age,
        "gender": profile.gender,
        "allergies": normalize_profile_text(profile.allergies),
        "chronicDiseases": normalize_profile_text(profile.chronic_diseases),
        "medicationHistory": normalize_profile_text(profile.medication_history),
    }


def apply_review(
    *,
    candidates: list[MedicineBrief],
    parsed: ParsedSymptoms,
    profile: UserProfile | None,
    flags: list[str],
    allow_rx_recommendation: bool,
    review: RiskReviewOutput,
) -> tuple[list[Recommend], list[dict[str, Any]]]:
    by_id = {medicine.id: medicine for medicine in candidates}
    reviewed_ids: set[str] = set()
    risked: list[Recommend] = []
    decisions: list[dict[str, Any]] = []

    for item in review.items:
        medicine = by_id.get(item.medicine_id)
        if not medicine:
            continue
        reviewed_ids.add(item.medicine_id)

        suitable = item.suitable
        reject_reason = item.reject_reason or ""
        if suitable and medicine.otc == "RX" and not allow_rx_recommendation:
            suitable = False
            reject_reason = "当前设置不推荐处方药，需医生或药师指导。"

        fallback = build_recommendation(medicine=medicine, parsed=parsed, profile=profile, flags=flags)
        reason = item.reason.strip() or fallback.reason
        warnings = merge_unique([*item.warnings, *fallback.warnings])
        if suitable:
            risked.append(Recommend(
                medicineId=medicine.id,
                name=medicine.name,
                otc=medicine.otc,
                indication=medicine.indication,
                reason=reason,
                warnings=warnings,
            ))

        decisions.append({
            "medicineId": medicine.id,
            "name": medicine.name,
            "otc": medicine.otc,
            "suitable": suitable,
            "reason": reason if suitable else "",
            "rejectReason": "" if suitable else (reject_reason or reason or "模型判断与当前问题不匹配。"),
            "warnings": warnings,
        })

    for medicine in candidates:
        if medicine.id in reviewed_ids:
            continue
        decisions.append({
            "medicineId": medicine.id,
            "name": medicine.name,
            "otc": medicine.otc,
            "suitable": False,
            "reason": "",
            "rejectReason": "模型未返回该候选药的审查结果，未纳入推荐。",
            "warnings": [],
        })

    return risked, decisions


def merge_unique(items: list[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        normalized = item.strip()
        if normalized and normalized not in result:
            result.append(normalized)
    return result
