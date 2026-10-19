import asyncio
import json

import httpx
import pytest
from pydantic import ValidationError

from app.config import Settings
from app.tools.cabinet_lookup import CabinetToolCall, search_household_cabinet


def call(**overrides):
    return CabinetToolCall(
        tool="search_household_cabinet", mode="name", names=["布洛芬"], symptoms="", **overrides
    )


def test_tool_uses_backend_scope_and_preserves_reference(monkeypatch):
    requests = []

    def handler(request):
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "id": "i-1",
                        "name": "布洛芬",
                        "otc": "OTC",
                        "indication": "头痛",
                        "reference": {
                            "source": "household_cabinet",
                            "inventoryId": "i-1",
                            "label": "家庭药箱",
                            "matchType": "exact",
                        },
                    }
                ]
            },
        )

    original = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    result = asyncio.run(
        search_household_cabinet(
            settings=Settings(agent_internal_token="internal", backend_base_url="http://backend"),
            scope="signed-scope",
            call=call(),
        )
    )
    assert result[0].reference.inventory_id == "i-1"
    assert json.loads(requests[0].content) == {
        "scope": "signed-scope",
        "mode": "name",
        "names": ["布洛芬"],
        "symptoms": "",
    }
    assert requests[0].headers["x-agent-token"] == "internal"


def test_missing_scope_and_model_supplied_permissions_are_rejected():
    with pytest.raises(ValueError, match="授权"):
        asyncio.run(search_household_cabinet(settings=Settings(), scope="", call=call()))
    with pytest.raises(ValidationError):
        CabinetToolCall.model_validate({**call().model_dump(), "householdId": "other"})
    with pytest.raises(ValidationError):
        CabinetToolCall.model_validate(
            {**call().model_dump(), "mode": "symptom", "symptoms": "头痛"}
        )


def test_tool_reports_embedding_outage_instead_of_empty_inventory(monkeypatch):
    original = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: original(
            transport=httpx.MockTransport(lambda request: httpx.Response(503)), **kwargs
        ),
    )
    with pytest.raises(ValueError, match="Embedding"):
        asyncio.run(search_household_cabinet(settings=Settings(), scope="signed", call=call()))
