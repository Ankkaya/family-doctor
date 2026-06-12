"""特殊人群规则判断节点。"""
from __future__ import annotations

from typing import Any

from ...schemas import ParsedSymptoms, UserProfile
from ...tools.safety_tools import normalize_profile_text
from ...tracing import trace_node


def make_special_population_node():
    async def special_population(state: dict[str, Any]) -> dict[str, Any]:
        profile: UserProfile | None = state.get("user_profile")
        parsed: ParsedSymptoms = state["parsed"]
        question = state.get("normalized_question") or state["question"]
        with trace_node(
            "special_population",
            {
                "age": profile.age if profile else None,
                "gender": profile.gender if profile else None,
                "populationHints": parsed.population_hints,
            },
        ) as rec:
            flags = set(parsed.population_hints)
            if profile:
                if profile.age is not None and profile.age < 12:
                    flags.add("child")
                if profile.age is not None and profile.age >= 65:
                    flags.add("elderly")
                chronic_diseases = normalize_profile_text(profile.chronic_diseases)
                medication_history = normalize_profile_text(profile.medication_history)
                allergies = normalize_profile_text(profile.allergies)
                if chronic_diseases:
                    flags.add("chronic_disease")
                profile_text = " ".join(
                    item
                    for item in [
                        chronic_diseases,
                        medication_history,
                        allergies,
                    ]
                    if item
                )
                if any(keyword in f"{question} {profile_text}" for keyword in ["孕", "怀孕", "妊娠"]):
                    flags.add("pregnant")
                if "哺乳" in f"{question} {profile_text}":
                    flags.add("lactating")
            rec.set_output({"flags": sorted(flags)})
        return {"special_population_flags": sorted(flags), "traces": [rec.step]}

    return special_population
