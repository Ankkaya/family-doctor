"""离线评测：加载 cases.yaml，跑 Agent，断言期望命中。

用法：
  uv run python tests/eval/run_eval.py
  LLM_PROVIDER=deepseek DEEPSEEK_API_KEY=xxx uv run python tests/eval/run_eval.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import yaml
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.main import create_app  # noqa: E402

CASES_PATH = Path(__file__).parent / "cases.yaml"


def run() -> int:
    data = yaml.safe_load(CASES_PATH.read_text(encoding="utf-8"))
    cases = data["cases"]
    client = TestClient(create_app())

    pass_cnt = 0
    fail: list[tuple[str, str]] = []

    for case in cases:
        r = client.post(
            "/agent/consult",
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
        recs = body.get("recommends", [])
        rec_ids = {x["medicineId"] for x in recs}

        if case.get("emergency"):
            if recs:
                fail.append((case["id"], f"expected empty but got {rec_ids}"))
                continue
        else:
            expected_any = set(case.get("expectedAny") or [])
            forbid = set(case.get("forbidIds") or [])
            if expected_any and not (rec_ids & expected_any):
                fail.append((case["id"], f"expected any of {expected_any}, got {rec_ids}"))
                continue
            if rec_ids & forbid:
                fail.append((case["id"], f"forbidden ids leaked: {rec_ids & forbid}"))
                continue

        pass_cnt += 1

    total = len(cases)
    print(f"PASS {pass_cnt}/{total}")
    for cid, msg in fail:
        print(f"  FAIL [{cid}] {msg}")
    return 0 if not fail else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(asyncio.to_thread(run)))
