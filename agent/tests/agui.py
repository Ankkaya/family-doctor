"""Run the real AG-UI endpoint and collect its final result for assertions/evaluation."""
from __future__ import annotations

import json
import json as jsonlib
import uuid
from collections.abc import Iterable

import httpx
from fastapi.testclient import TestClient


def parse_events(lines: Iterable[str]) -> list[dict]:
    events = []
    data = []
    for line in lines:
        if line.startswith("data:"):
            data.append(line[5:].strip())
        elif not line and data:
            events.append(json.loads("\n".join(data)))
            data = []
    if data:
        events.append(json.loads("\n".join(data)))
    return events


def run_input(payload: dict) -> dict:
    return {
        "threadId": payload["sessionId"], "runId": str(uuid.uuid4()),
        "state": {}, "tools": [], "context": [],
        "messages": [{"id": str(uuid.uuid4()), "role": "user", "content": payload["question"]}],
        "forwardedProps": payload,
    }


def post_consult(client: TestClient, *, json: dict, headers: dict | None = None) -> httpx.Response:
    payload = dict(json)
    if getattr(client.app.state, "cabinet_test_inventory", False):
        payload["cabinetScope"] = "test:" + jsonlib.dumps(payload.pop("medicines", []))
    response = client.post("/agent/ag-ui", json=run_input(payload), headers={
        "Accept": "text/event-stream", **(headers or {}),
    })
    if response.status_code != 200:
        return response
    events = parse_events(response.text.splitlines())
    assert events and events[-1]["type"] == "RUN_FINISHED", events
    assert not any(event["type"] == "RUN_ERROR" for event in events), events
    return httpx.Response(200, json=events[-1]["result"], request=response.request)
