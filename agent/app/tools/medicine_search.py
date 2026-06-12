from __future__ import annotations

from ..schemas import MedicineBrief, ParsedSymptoms

TOP_K = 5
MIN_VECTOR_SCORE = 0.32

SYMPTOM_ALIASES = {
    "头疼": ["头疼", "头痛"],
    "头痛": ["头痛", "头疼"],
    "发烧": ["发烧", "发热"],
    "发热": ["发热", "发烧"],
    "肚子疼": ["肚子疼", "腹痛", "腹疼"],
    "腹疼": ["腹疼", "腹痛", "肚子疼"],
    "腹痛": ["腹痛", "腹疼", "肚子疼"],
    "流鼻涕": ["流鼻涕", "流涕"],
    "流涕": ["流涕", "流鼻涕"],
    "嗓子疼": ["嗓子疼", "咽痛", "咽喉痛"],
    "喉咙痛": ["喉咙痛", "咽痛", "咽喉痛"],
    "咽痛": ["咽痛", "喉咙痛", "嗓子疼", "咽喉痛"],
}


def search_medicines(
    *,
    medicines: list[MedicineBrief],
    parsed: ParsedSymptoms,
    query_text: str = "",
    allow_rx_recommendation: bool,
    emergency: bool,
) -> list[MedicineBrief]:
    if parsed.emergency or emergency:
        return []

    symptoms = _merge_symptoms(parsed.symptoms, _infer_symptoms_from_text(query_text))
    scored = [
        (medicine, _score(medicine, symptoms), _has_direct_match(medicine, symptoms))
        for medicine in medicines
        if allow_rx_recommendation or medicine.otc == "OTC"
    ]
    direct_scored = [item for item in scored if item[2]]
    if direct_scored:
        scored = direct_scored
    else:
        scored = [
            item
            for item in scored
            if (item[0].search_score or 0) >= MIN_VECTOR_SCORE
            or item[0].search_source in {"fulltext", "keyword"}
        ]

    scored.sort(
        key=lambda item: (
            item[0].search_score or 0,
            item[1],
            1 if item[0].otc == "OTC" else 0,
        ),
        reverse=True,
    )
    candidates = [
        medicine
        for medicine, score, has_direct_match in scored
        if has_direct_match or score > 0 or (medicine.search_score or 0) >= MIN_VECTOR_SCORE
    ][:TOP_K]
    return candidates


def _merge_symptoms(primary: list[str], fallback: list[str]) -> list[str]:
    result: list[str] = []
    for item in [*primary, *fallback]:
        normalized = item.strip()
        if normalized and normalized not in result:
            result.append(normalized)
    return result


def _infer_symptoms_from_text(text: str) -> list[str]:
    normalized = text.strip()
    symptoms: list[str] = []
    if "头" in normalized and ("疼" in normalized or "痛" in normalized):
        symptoms.append("头痛")
    if "发烧" in normalized or "发热" in normalized:
        symptoms.append("发热")
    if "咳" in normalized:
        symptoms.append("咳嗽")
    if ("喉咙" in normalized or "嗓子" in normalized or "咽" in normalized) and ("疼" in normalized or "痛" in normalized):
        symptoms.append("咽痛")
    if ("肚子" in normalized or "腹" in normalized) and ("疼" in normalized or "痛" in normalized):
        symptoms.append("腹痛")
    if "腹泻" in normalized or "拉肚子" in normalized:
        symptoms.append("腹泻")
    if "流鼻涕" in normalized or "流涕" in normalized:
        symptoms.append("流涕")
    if "鼻塞" in normalized:
        symptoms.append("鼻塞")
    return symptoms


def _score(med: MedicineBrief, symptoms: list[str]) -> int:
    haystack = f"{med.name} {med.indication}".lower()
    return sum(1 for symptom in _expand_symptoms(symptoms) if symptom and symptom.lower() in haystack)


def _has_direct_match(med: MedicineBrief, symptoms: list[str]) -> bool:
    return _score(med, symptoms) > 0


def _expand_symptoms(symptoms: list[str]) -> list[str]:
    expanded: list[str] = []
    for symptom in symptoms:
        normalized = symptom.strip()
        if not normalized:
            continue
        expanded.extend(SYMPTOM_ALIASES.get(normalized, [normalized]))

    result: list[str] = []
    for item in expanded:
        if item not in result:
            result.append(item)
    return result
