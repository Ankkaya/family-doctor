"""风险提示节点。结合用户画像、症状和候选药品生成推荐风险。"""
from __future__ import annotations

import json
from typing import Any

from ...llm.provider import LLMProvider
from ...schemas import MedicineBrief, ParsedSymptoms, Recommend, RiskReviewOutput, UserProfile
from ...tools.safety_tools import build_recommendation, normalize_profile_text
from ...tracing import trace_node

RISK_SYSTEM = (
    "你是家庭用药风险审查助手。请基于用户问题、结构化症状、用户基础信息和候选药品，"
    "判断每个候选药是否适合当前症状，并给出面向用户的推荐理由和风险提示。\n"
    "要求：\n"
    "1. 只允许使用输入中的 medicineId，不要编造药品。\n"
    "2. 药品适应症必须与当前症状明确相关才 suitable=true；泛化词如“止痛”“清热”不能单独证明适合具体症状。\n"
    "3. 结合过敏史、基础病、长期用药、儿童/老人/孕期等信息输出统一风险提示。\n"
    "4. 不要暴露 fulltext、keyword、vector、searchScore 等内部检索信息。\n"
    "5. 如不适合当前症状，suitable=false，并说明原因。"
)


def make_risk_node(llm: LLMProvider):
    async def risk(state: dict[str, Any]) -> dict[str, Any]:
        parsed: ParsedSymptoms = state["parsed"]
        profile: UserProfile | None = state.get("user_profile")
        candidates: list[MedicineBrief] = state.get("candidates") or []
        flags: list[str] = state.get("special_population_flags") or []
        with trace_node(
            "risk",
            {
                "candidateIds": [m.id for m in candidates],
                "populationHints": parsed.population_hints,
                "flags": flags,
            },
        ) as rec:
            if not candidates:
                rec.set_output({"count": 0, "reviewed": 0})
                return {"risked": [], "traces": [rec.step]}

            review = await llm.structured(
                system=RISK_SYSTEM,
                user=build_risk_review_prompt(
                    question=state.get("normalized_question") or state.get("question") or "",
                    parsed=parsed,
                    profile=profile,
                    flags=flags,
                    candidates=candidates,
                ),
                schema=RiskReviewOutput,
            )
            risked = apply_risk_review(
                candidates=candidates,
                parsed=parsed,
                profile=profile,
                flags=flags,
                review=review,
            )
            rec.set_output({
                "count": len(risked),
                "reviewed": len(review.items),
                "recommendedIds": [item.medicine_id for item in risked],
                "rejectedIds": [
                    item.medicine_id
                    for item in review.items
                    if not item.suitable
                ],
            })
            rec.set_llm(model=llm.model)
        return {"risked": risked, "traces": [rec.step]}

    return risk


def build_risk_review_prompt(
    *,
    question: str,
    parsed: ParsedSymptoms,
    profile: UserProfile | None,
    flags: list[str],
    candidates: list[MedicineBrief],
) -> str:
    payload = {
        "question": question,
        "parsedSymptoms": parsed.model_dump(by_alias=True),
        "userProfile": dump_user_profile(profile),
        "riskFlags": flags,
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


def apply_risk_review(
    *,
    candidates: list[MedicineBrief],
    parsed: ParsedSymptoms,
    profile: UserProfile | None,
    flags: list[str],
    review: RiskReviewOutput,
) -> list[Recommend]:
    by_id = {medicine.id: medicine for medicine in candidates}
    reviewed_ids: set[str] = set()
    risked: list[Recommend] = []

    for item in review.items:
        medicine = by_id.get(item.medicine_id)
        if not medicine:
            continue
        reviewed_ids.add(item.medicine_id)
        if not item.suitable:
            continue

        fallback = build_recommendation(medicine=medicine, parsed=parsed, profile=profile, flags=flags)
        risked.append(Recommend(
            medicineId=medicine.id,
            name=medicine.name,
            otc=medicine.otc,
            indication=medicine.indication,
            reason=item.reason.strip() or fallback.reason,
            warnings=merge_unique([*item.warnings, *fallback.warnings]),
        ))

    for medicine in candidates:
        if medicine.id not in reviewed_ids:
            risked.append(build_recommendation(medicine=medicine, parsed=parsed, profile=profile, flags=flags))

    return risked


def merge_unique(items: list[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        normalized = item.strip()
        if normalized and normalized not in result:
            result.append(normalized)
    return result
