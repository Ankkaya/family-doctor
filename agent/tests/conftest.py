import json

import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.config import get_settings
from app.schemas import MedicineBrief
from tests.medicine_fakes import FakeProvider


@pytest.fixture
def provider():
    return FakeProvider()


@pytest.fixture
def client(monkeypatch, provider):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("AGENT_INTERNAL_TOKEN", "test-agent-token")
    monkeypatch.setattr(main_module, "get_llm_provider", lambda settings: provider)

    async def fake_lookup(*, settings, scope, call):
        if not scope.startswith("test:"):
            raise ValueError("药箱查询缺少会话授权")
        return [
            MedicineBrief.model_validate(
                {
                    **item,
                    "reference": {
                        "source": "household_cabinet",
                        "inventoryId": item["id"],
                        "label": "家庭药箱",
                        "matchType": {
                            "name": "exact",
                            "symptom": "semantic",
                            "inventory": "inventory",
                        }[call.mode],
                    },
                }
            )
            for item in json.loads(scope.removeprefix("test:"))
        ]

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", fake_lookup)
    get_settings.cache_clear()
    with TestClient(
        main_module.create_app(), headers={"x-agent-token": "test-agent-token"}
    ) as test_client:
        test_client.app.state.cabinet_test_inventory = True
        yield test_client
    get_settings.cache_clear()
