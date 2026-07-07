from __future__ import annotations

from collections.abc import Generator
import json
from typing import TypeVar

import pytest
from fastapi.testclient import TestClient
from pydantic import BaseModel

from app.config import get_settings
from app import main as main_module
from app.schemas import ParsedSymptoms, RecognizeMedicineImagesResponse, RiskReviewOutput

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
    candidates = ["头痛", "头疼", "发热", "咳嗽", "咽痛", "腹泻", "恶心", "呕吐", "流涕", "鼻塞", "口腔溃疡"]
    symptoms = [kw for kw in candidates if kw in text]
    if "头好疼" in text and "头疼" not in symptoms:
        symptoms.append("头疼")
    return symptoms


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
        if schema is RiskReviewOutput:
            payload = json.loads(user)
            symptoms = payload.get("parsedSymptoms", {}).get("symptoms", [])
            items = []
            for medicine in payload.get("candidateMedicines", []):
                indication = medicine.get("indication") or ""
                matched = [
                    symptom
                    for symptom in symptoms
                    if symptom and (
                        symptom in indication
                        or (symptom == "头疼" and "头痛" in indication)
                        or (symptom == "口腔溃疡" and "口疮" in indication)
                    )
                ]
                items.append(
                    {
                        "medicineId": medicine["medicineId"],
                        "suitable": bool(matched) or "不舒服" in symptoms,
                        "reason": (
                            f"模型审查认为该药适应症与{matched[0]}相关。"
                            if matched
                            else "请结合药品说明书、禁忌和药师建议确认是否适合当前症状。"
                        ),
                        "rejectReason": "" if matched else "模型审查认为该药适应症与当前症状不匹配。",
                        "warnings": ["模型审查：请关注禁忌和不良反应"],
                    }
                )
            return schema.model_validate({"items": items})
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
    assert {t["nodeName"] for t in body["traces"]} >= {"parse", "match", "review", "render"}
    assert body["sessionSummary"]["symptoms"]
    assert "summarize" in {t["nodeName"] for t in body["traces"]}


def test_consult_uses_history_for_follow_up_question(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-follow-up",
            "question": "那这个药饭后吃可以吗",
            "historyMessages": [
                {
                    "role": "USER",
                    "content": "我这两天头痛发热，家里有什么药",
                    "createdAt": "2026-06-18T09:00:00.000Z",
                },
                {
                    "role": "ASSISTANT",
                    "content": "可考虑布洛芬缓释胶囊，并注意胃部不适风险。",
                    "createdAt": "2026-06-18T09:01:00.000Z",
                },
            ],
            "sessionSummary": {
                "chiefComplaint": "头痛、发热",
                "symptoms": ["头痛", "发热"],
                "riskFlags": [],
                "mentionedMedicines": ["布洛芬缓释胶囊"],
                "rejectedMedicines": [],
                "recommendedMedicines": ["布洛芬缓释胶囊"],
                "temporaryUserFacts": [],
                "unresolvedQuestions": [],
                "lastTopic": "头痛、发热",
                "suggestedStatus": "resolved",
            },
            "medicines": SAMPLE_MEDICINES,
        },
    )
    assert r.status_code == 200
    body = r.json()
    names = [item["name"] for item in body["recommends"]]
    assert "布洛芬缓释胶囊" in names
    assert "头痛" in body["sessionSummary"]["symptoms"]


def test_consult_does_not_recommend_weak_vector_match_for_headache(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-headache",
            "question": "我头好疼",
            "medicines": [
                {
                    "id": "ibu",
                    "name": "布洛芬缓释胶囊",
                    "otc": "OTC",
                    "indication": "头痛、发热、肌肉酸痛的短期缓解",
                    "searchScore": 0.1,
                    "searchSource": "vector",
                },
                {
                    "id": "propolis",
                    "name": "蜂胶口腔膜",
                    "otc": "OTC",
                    "indication": "清热止痛，用于复发性口疮。",
                    "searchScore": 0.9,
                    "searchSource": "vector",
                },
            ],
        },
    )
    assert r.status_code == 200
    names = [item["name"] for item in r.json()["recommends"]]
    assert "布洛芬缓释胶囊" in names
    assert "蜂胶口腔膜" not in names
    match_trace = next(trace for trace in r.json()["traces"] if trace["nodeName"] == "match")
    assert set(match_trace["output"]["candidateIds"]) == {"ibu", "propolis"}
    review_trace = next(trace for trace in r.json()["traces"] if trace["nodeName"] == "review")
    rejected_ids = [item["medicineId"] for item in review_trace["output"]["rejected"]]
    assert "propolis" in rejected_ids
    ibu = next(item for item in r.json()["recommends"] if item["name"] == "布洛芬缓释胶囊")
    assert "模型审查" in ibu["reason"]
    assert "模型审查：请关注禁忌和不良反应" in ibu["warnings"]


def test_consult_matches_oral_ulcer_to_stomatitis_indication(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-oral-ulcer",
            "question": "我口腔溃疡了",
            "medicines": [
                {
                    "id": "propolis",
                    "name": "蜂胶口腔膜",
                    "otc": "OTC",
                    "indication": "清热止痛，用于复发性口疮。",
                    "searchScore": 0.0,
                    "searchSource": "vector",
                },
            ],
        },
    )
    assert r.status_code == 200
    body = r.json()
    names = [item["name"] for item in body["recommends"]]
    assert "蜂胶口腔膜" in names
    assert "没有找到" not in body["answer"]


def test_consult_reason_does_not_expose_vector_source(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-vector-reason",
            "question": "我头痛",
            "medicines": [
                {
                    "id": "general",
                    "name": "测试药品",
                    "otc": "OTC",
                    "indication": "用于头痛测试场景",
                    "searchScore": 0.8,
                    "searchSource": "vector",
                },
            ],
        },
    )
    assert r.status_code == 200
    reasons = [item["reason"] for item in r.json()["recommends"]]
    assert reasons
    assert all("来源：vector" not in reason for reason in reasons)
    assert all("检索结果" not in reason for reason in reasons)


def test_consult_answer_explains_when_no_suitable_medicine(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-no-suitable",
            "question": "我头好疼",
            "medicines": [
                {
                    "id": "propolis",
                    "name": "蜂胶口腔膜",
                    "otc": "OTC",
                    "indication": "用于复发性口疮。",
                    "searchScore": 0.1,
                    "searchSource": "vector",
                },
            ],
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["recommends"] == []
    assert "没有找到" in body["answer"]
    assert "家庭药箱药品" in body["answer"]


def test_consult_ignores_negative_profile_markers(client: TestClient) -> None:
    r = client.post(
        "/agent/consult",
        json={
            "sessionId": "s-empty-profile-markers",
            "question": "你好",
            "medicines": [],
            "userProfile": {
                "age": 34,
                "gender": "male",
                "allergies": "无",
                "chronicDiseases": "无",
                "medicationHistory": "暂无",
            },
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert "慢性病" not in body["answer"]
    special_population = next(
        trace
        for trace in body["traces"]
        if trace["nodeName"] == "special_population"
    )
    assert "chronic_disease" not in special_population["output"]["flags"]


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


def test_consult_stream_reports_node_progress(client: TestClient) -> None:
    with client.stream(
        "POST",
        "/agent/consult/stream",
        json={
            "sessionId": "s-stream",
            "question": "这两天头痛发热，家里能吃什么药",
            "medicines": SAMPLE_MEDICINES,
        },
    ) as response:
        assert response.status_code == 200
        events = [json.loads(line) for line in response.iter_lines() if line]

    status_messages = [
        event["message"]
        for event in events
        if event["type"] == "status"
    ]
    assert "正在识别症状和持续时间" in status_messages
    assert "正在匹配家庭药箱药品" in status_messages
    assert "正在审查药品适配性" in status_messages
    assert "正在组织回复" in status_messages

    complete = events[-1]
    assert complete["type"] == "complete"
    assert complete["answer"]
    answer_deltas = [
        event["delta"]
        for event in events
        if event["type"] == "answer_delta"
    ]
    assert answer_deltas
    assert "".join(answer_deltas) == complete["answer"]
    assert complete["disclaimer"]
    assert len(complete["traces"]) >= 4


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
