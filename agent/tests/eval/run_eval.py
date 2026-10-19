"""离线评测：加载 medicine-cases.yaml，跑 Agent，断言期望命中。

用法：
  uv run python tests/eval/run_eval.py
  LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=xxx uv run python tests/eval/run_eval.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import patch

import yaml
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.config import get_settings  # noqa: E402
from app.main import create_app  # noqa: E402
from app.schemas import MedicineBrief
from tests.agui import post_consult  # noqa: E402

CASES_PATH = Path(__file__).parent / "medicine-cases.yaml"


def run() -> int:
    data = yaml.safe_load(CASES_PATH.read_text(encoding="utf-8"))
    cases = data["cases"]

    pass_cnt = 0
    fail: list[tuple[str, str]] = []

    # Offline evaluation mocks only the authorized storage-tool boundary, not native model/tool selection or the retry middleware.
    async def fixture_lookup(*, settings, scope, call):
        return [
            MedicineBrief.model_validate(item) for item in json.loads(scope.removeprefix("test:"))
        ]

    with (
        patch("app.medicine.tools.search_household_cabinet", fixture_lookup),
        TestClient(
            create_app(), headers={"x-agent-token": get_settings().agent_internal_token}
        ) as client,
    ):
        client.app.state.cabinet_test_inventory = True
        for case in cases:
            r = post_consult(
                client,
                json={
                    "sessionId": case["id"],
                    "question": case["question"],
                    "medicines": case["medicines"],
                },
            )
            if r.status_code != 200:
                fail.append((case["id"], f"HTTP {r.status_code}"))
                continue

            body = r.json()
            trace = next(
                (item for item in body.get("traces", []) if item["nodeName"] == "medicine"), None
            )
            if not trace or not 1 <= trace["output"]["mainModelCalls"] <= 2:
                fail.append((case["id"], "missing medicine run or invalid main-model budget"))
                continue
            outcomes = trace["output"]["lookupResults"]
            found = {item["id"] for outcome in outcomes for item in outcome.get("items", [])}
            expected = set(case.get("expectedLookupAny") or [])
            if expected and not found.intersection(expected):
                fail.append((case["id"], f"expected lookup result {expected}, got {found}"))
                continue
            reason = case.get("expectedReason")
            if reason and not any(outcome.get("reasonCode") == reason for outcome in outcomes):
                fail.append((case["id"], f"expected lookup reason {reason}"))
                continue
            if not body.get("answer"):
                fail.append((case["id"], "empty answer"))
                continue

            pass_cnt += 1

    total = len(cases)
    print(f"PASS {pass_cnt}/{total}")
    for cid, msg in fail:
        print(f"  FAIL [{cid}] {msg}")
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(asyncio.to_thread(run)))
