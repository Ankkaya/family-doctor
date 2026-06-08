from __future__ import annotations

from ..schemas import MedicineBrief, ParsedSymptoms

TOP_K = 5


def search_medicines(
    *,
    medicines: list[MedicineBrief],
    parsed: ParsedSymptoms,
    allow_rx_recommendation: bool,
    emergency: bool,
) -> list[MedicineBrief]:
    if parsed.emergency or emergency:
        return []

    scored = [
        (medicine, _score(medicine, parsed.symptoms))
        for medicine in medicines
        if allow_rx_recommendation or medicine.otc == "OTC"
    ]
    scored.sort(
        key=lambda item: (
            item[0].search_score or 0,
            item[1],
            1 if item[0].otc == "OTC" else 0,
        ),
        reverse=True,
    )
    candidates = [medicine for medicine, score in scored if score > 0 or medicine.search_score][:TOP_K]
    if not candidates:
        candidates = [medicine for medicine, _ in scored][:TOP_K]
    return candidates


def _score(med: MedicineBrief, symptoms: list[str]) -> int:
    haystack = f"{med.name} {med.indication}".lower()
    return sum(1 for symptom in symptoms if symptom and symptom.lower() in haystack)
