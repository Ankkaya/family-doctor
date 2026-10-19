from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from app.schemas import IntentDecision
from app.tools.intent_router import classify_intent, should_run_consult_graph


@pytest.mark.asyncio
@pytest.mark.parametrize("profile", ["general", "medicine"])
async def test_router_returns_only_supported_profile(profile: str) -> None:
    llm = AsyncMock()
    llm.model = "test"
    llm.structured.return_value = IntentDecision(profile=profile, content="消解后的问题")
    decision, trace = await classify_intent(llm=llm, question="本轮问题", history_messages=[])
    assert decision.model_dump(by_alias=True) == {"profile": profile, "content": "消解后的问题"}
    assert should_run_consult_graph(decision) == (profile == "medicine")
    assert trace.input["promptVersion"] == "v3"
    assert trace.output == {"profile": profile, "content": "消解后的问题"}


@pytest.mark.asyncio
async def test_router_failure_falls_back_to_general() -> None:
    llm = AsyncMock()
    llm.model = "test"
    llm.structured.side_effect = RuntimeError("分类失败")
    decision, trace = await classify_intent(llm=llm, question="问题", history_messages=[])
    assert decision.profile == "general"
    assert decision.content == "问题"
    assert not should_run_consult_graph(decision)
    assert trace.output["error"] == "分类失败"


@pytest.mark.parametrize("value", [{"profile": "medicine_search"}, {"intent": "medicine_consult"}])
def test_router_rejects_old_categories(value: dict) -> None:
    with pytest.raises(ValidationError):
        IntentDecision.model_validate(value)


@pytest.mark.parametrize("value", [
    {"profile": "medicine"},
    {"profile": "medicine", "content": ""},
    {"profile": "medicine", "content": "   "},
    {"profile": "medicine", "content": None},
    {"profile": "medicine", "content": 123},
    {"profile": "medicine", "content": "问" * 2001},
    {"profile": "medicine", "content": "问题", "confidence": 0.9},
    {"profile": "other", "content": "问题"},
])
def test_decision_strictly_validates_content_and_fields(value: dict) -> None:
    with pytest.raises(ValidationError):
        IntentDecision.model_validate(value)


def test_decision_trims_content_and_exports_strict_json_schema() -> None:
    decision = IntentDecision(profile="medicine", content="  布洛芬饭后吃吗？  ")
    assert decision.content == "布洛芬饭后吃吗？"
    schema = IntentDecision.model_json_schema()
    assert set(schema["required"]) == {"profile", "content"}
    assert schema["additionalProperties"] is False
    assert schema["properties"]["content"]["minLength"] == 1
    assert schema["properties"]["content"]["maxLength"] == 2000
