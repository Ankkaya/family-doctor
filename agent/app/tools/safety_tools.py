from __future__ import annotations

from ..schemas import MedicineBrief, ParsedSymptoms, Recommend, UserProfile
from .medicine_search import SYMPTOM_ALIASES

EMPTY_PROFILE_VALUES = {
    "无",
    "暂无",
    "没有",
    "无无",
    "无过敏史",
    "无基础病",
    "无慢性病",
    "无慢性病史",
    "无长期用药",
    "none",
    "no",
    "n/a",
    "na",
}


def build_recommendation(
    *,
    medicine: MedicineBrief,
    parsed: ParsedSymptoms,
    profile: UserProfile | None,
    flags: list[str],
) -> Recommend:
    return Recommend(
        medicineId=medicine.id,
        name=medicine.name,
        otc=medicine.otc,
        indication=medicine.indication,
        reason=build_reason(medicine, parsed),
        warnings=build_warnings(medicine, profile, flags),
    )


def build_reason(med: MedicineBrief, parsed: ParsedSymptoms) -> str:
    matched = [
        symptom
        for symptom in expand_symptoms(parsed.symptoms)
        if symptom and symptom in med.indication
    ]
    if matched:
        return f"家庭药箱中该药适应症与{', '.join(matched)}相关。"
    return "请结合药品说明书、禁忌和药师建议确认是否适合当前症状。"


def build_warnings(med: MedicineBrief, profile: UserProfile | None, flags: list[str]) -> list[str]:
    warnings: list[str] = []
    contraindication = med.contraindication or ""
    profile_text = ""
    if profile:
        profile_text = " ".join(
            item
            for item in [
                normalize_profile_text(profile.allergies),
                normalize_profile_text(profile.chronic_diseases),
                normalize_profile_text(profile.medication_history),
            ]
            if item
        )

    if med.otc == "RX":
        warnings.append("处方药需在线下医生或药师指导下使用，不建议自行用药。")
    allergies = normalize_profile_text(profile.allergies) if profile else None
    chronic_diseases = normalize_profile_text(profile.chronic_diseases) if profile else None
    if allergies and any(token and token in contraindication for token in split_terms(allergies)):
        warnings.append("过敏史可能与该药禁忌相关，请避免自行使用。")
    if chronic_diseases and any(token and token in contraindication for token in split_terms(chronic_diseases)):
        warnings.append("基础病可能与该药禁忌相关，请先咨询医生或药师。")
    if "child" in flags:
        warnings.append("儿童用药需按年龄和体重谨慎评估。")
    if "elderly" in flags:
        warnings.append("老人用药需关注肝肾功能和多药联用风险。")
    if "pregnant" in flags or "lactating" in flags:
        warnings.append("孕期或哺乳期请先咨询医生，不建议自行用药。")
    if "肝" in profile_text or "肾" in profile_text:
        warnings.append("存在肝肾相关信息时，用药前应确认说明书禁忌和剂量限制。")
    if med.adverse_reaction:
        warnings.append(f"可能不良反应：{med.adverse_reaction}")

    return dedupe(warnings)


def audit_recommendations(
    *,
    recommends: list[Recommend],
    emergency: bool,
    flags: list[str],
) -> tuple[str, list[str]]:
    warnings: list[str] = []
    if emergency:
        warnings.append("命中急症信号，停止药品推荐")
    if not recommends and not emergency:
        warnings.append("未找到足够匹配的家庭药箱药品")
    if flags:
        warnings.append(f"特殊人群/风险线索：{', '.join(flags)}")
    has_rx = any(item.otc == "RX" for item in recommends)
    if has_rx:
        warnings.append("包含处方药，仅可作为就医沟通参考")
    risk_level = "high" if emergency or has_rx else ("medium" if flags else "low")
    return risk_level, warnings


def split_terms(text: str) -> list[str]:
    normalized = text.replace("，", ",").replace("、", ",").replace("；", ",").replace(";", ",")
    return [item.strip() for item in normalized.split(",") if item.strip()]


def normalize_profile_text(text: str | None) -> str | None:
    normalized = text.strip() if text else ""
    if not normalized:
        return None

    compact = "".join(normalized.split()).lower()
    return None if compact in EMPTY_PROFILE_VALUES else normalized


def expand_symptoms(symptoms: list[str]) -> list[str]:
    expanded: list[str] = []
    for symptom in symptoms:
        normalized = symptom.strip()
        if not normalized:
            continue
        expanded.extend(SYMPTOM_ALIASES.get(normalized, [normalized]))

    return dedupe(expanded)


def dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    for item in items:
        if item not in result:
            result.append(item)
    return result
