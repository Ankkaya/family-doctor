from __future__ import annotations

from collections.abc import Generator
from typing import TypeVar

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.config import get_settings
from app import main as main_module
from app.schemas import ParsedSymptoms, RecognizeMedicineImagesResponse

T = TypeVar("T", bound=BaseModel)

EMERGENCY_KEYWORDS = (
    "自杀", "自伤", "大出血", "呼吸困难", "意识不清", "昏迷", "胸痛", "休克",
)

SAMPLE_MEDICINES = [
    {
        "id": "ibu",
        "name": "布洛芬缓释胶囊",
        "otc": "OTC",
        "indication": "头痛、发热、肌肉酸痛的短期缓解",
        "contraindication": "胃溃疡、孕晚期慎用",
        "adverseReaction": "胃部不适、恶心",
    },
    {
        "id": "lhqw",
        "name": "连花清瘟胶囊",
        "otc": "OTC",
        "indication": "发热、咳嗽、咽干咽痛",
        "contraindication": "风寒感冒、孕妇慎用",
    },
    {
        "id": "amx",
        "name": "阿莫西林胶囊",
        "otc": "RX",
        "indication": "细菌感染相关炎症",
        "contraindication": "青霉素过敏禁用",
    },
]


def _keyword_symptoms(text: str) -> list[str]:
    candidates = ["头痛", "发热", "咳嗽", "咽痛", "腹泻", "恶心", "呕吐", "流涕", "鼻塞"]
    return [kw for kw in candidates if kw in text]


class FakeProvider:
    def __init__(self, model: str = "test-model") -> None:
        self.model = model

    async def chat(self, *, system: str, user: str) -> str:  # noqa: ARG002
        return "测试模型回复：请结合症状休息观察，必要时就医。"

    async def structured(self, *, system: str, user: str, schema: type[T]) -> T:  # noqa: ARG002
        if schema is ParsedSymptoms:
            emergency = any(keyword in user for keyword in EMERGENCY_KEYWORDS)
            return schema.model_validate(
                {
                    "symptoms": _keyword_symptoms(user) or ["不适"],
                    "severity": "mild",
                    "duration": None,
                    "populationHints": [],
                    "emergency": emergency,
                }
            )
        return schema.model_validate(
            {
                "reason": "测试模型判断适应症匹配",
                "warnings": ["请阅读说明书并关注禁忌人群"],
            }
        )

    async def structured_with_images(
        self,
        *,
        system: str,
        user: str,
        images: list[dict[str, str]],
        schema: type[T],
    ) -> T:  # noqa: ARG002
        if schema is RecognizeMedicineImagesResponse:
            return schema.model_validate(
                {
                    "name": "布洛芬缓释胶囊",
                    "aliases": ["芬必得"],
                    "otc": "OTC",
                    "indication": "用于缓解头痛、发热、肌肉酸痛",
                    "contraindication": "胃溃疡患者慎用",
                    "adverseReaction": "可能出现恶心、胃部不适",
                    "dosage": "口服，一次 1 粒",
                    "barcode": "6901234567890",
                    "approvalNumber": "国药准字H20240001",
                    "manufacturer": "测试制药有限公司",
                    "expireAt": "2026-12-31",
                    "confidence": 0.92,
                    "rawText": f"共识别 {len(images)} 张图片，提取到药盒关键信息",
                    "warnings": [],
                }
            )
        raise AssertionError(f"unexpected schema: {schema}")


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("LLM_MODEL", "test-model")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(
        main_module,
        "get_llm_provider",
        lambda settings: FakeProvider(model=settings.llm_model),
    )
    get_settings.cache_clear()
    with TestClient(main_module.create_app()) as test_client:
        yield test_client
    get_settings.cache_clear()


def test_health(client: TestClient) -> None:
    r = client.get("/agent/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_consult_basic(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s1",
            "question": "这两天头痛发热，家里能吃什么药",
            "medicines": SAMPLE_MEDICINES,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["answer"]
    assert body["disclaimer"]
    # RX 药必须被过滤掉
    assert all(rec["otc"] == "OTC" for rec in body["recommends"])
    # trace 至少 4 个节点
    assert len(body["traces"]) >= 4
    assert {t["nodeName"] for t in body["traces"]} >= {"parse", "match", "risk", "render"}


def test_consult_emergency(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s2",
            "question": "患者突然胸痛意识不清",
            "medicines": SAMPLE_MEDICINES,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["recommends"] == []
    assert "120" in body["answer"] or "急诊" in body["answer"]


def test_recognize_medicine_images(client: TestClient) -> None:
    r = client.post(
        "/agent/medicine/recognize-images",
        json={
            "images": [
                {
                    "filename": "box-1.jpg",
                    "mimeType": "image/jpeg",
                    "dataBase64": "dGVzdA==",
                },
                {
                    "filename": "leaflet-1.jpg",
                    "mimeType": "image/jpeg",
                    "dataBase64": "dGVzdDI=",
                },
            ]
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "布洛芬缓释胶囊"
    assert body["otc"] == "OTC"
    assert body["barcode"] == "6901234567890"
    assert body["approvalNumber"] == "国药准字H20240001"
