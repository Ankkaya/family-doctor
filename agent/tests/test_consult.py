import json

from app.schemas import IntentDecision
from tests.agui import parse_events, post_consult, run_input
from tests.medicine_fakes import SAMPLE_MEDICINES


def test_health_and_internal_auth(client):
    assert client.get("/agent/health").status_code == 200
    response = client.post(
        "/agent/ag-ui",
        json=run_input({"sessionId": "auth", "question": "头痛"}),
        headers={"x-agent-token": "wrong"},
    )
    assert response.status_code == 403


def test_medicine_image_recognition_remains_available(client):
    response = client.post(
        "/agent/medicine/recognize-images",
        json={
            "images": [{"filename": "box.jpg", "mimeType": "image/jpeg", "dataBase64": "dGVzdA=="}]
        },
    )
    assert response.status_code == 200
    assert response.json()["name"] == "测试药品"


def test_agui_native_medicine_returns_persistable_result(client, provider):
    result = post_consult(
        client,
        json={"sessionId": "medicine", "question": "家里有布洛芬吗", "medicines": SAMPLE_MEDICINES},
    ).json()
    assert result["answer"]
    assert "药品资料来源：家庭药箱" in result["answer"]
    assert result["sessionSummary"]["mentionedMedicines"] == ["布洛芬"]
    nodes = {step["nodeName"] for step in result["traces"]}
    assert nodes == {"intent_router", "medicine_lookup", "medicine", "retrieval_evaluation"}
    assert provider.native.calls == 2
    assert not provider.chat_calls
    assert not provider.rewrites
    assert "cabinetScope" not in json.dumps(result)


def test_agui_complete_answer_matches_content_events(client, provider):
    payload = run_input(
        {
            "sessionId": "events",
            "question": "查布洛芬",
            "cabinetScope": "test:" + json.dumps(SAMPLE_MEDICINES),
        }
    )
    response = client.post("/agent/ag-ui", json=payload)
    events = parse_events(response.text.splitlines())
    assert events[0]["type"] == "RUN_STARTED"
    assert events[-1]["type"] == "RUN_FINISHED"
    assert events[-1]["result"]["answer"] == "".join(
        event["delta"] for event in events if event["type"] == "TEXT_MESSAGE_CONTENT"
    )
    assert "cabinetScope" not in json.dumps(events)
    assert "test:" not in json.dumps(events)


def test_classifier_and_main_model_use_independent_role_history(client, provider, monkeypatch):
    calls = []
    original = provider.structured

    async def structured(**kwargs):
        calls.append(kwargs)
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)
    question = "这个药有吗？"
    history = [
        {"role": "USER", "content": "我头痛"},
        {"role": "ASSISTANT", "content": "之前提到布洛芬"},
    ]
    post_consult(
        client,
        json={
            "sessionId": "history",
            "question": question,
            "historyMessages": history,
            "medicines": SAMPLE_MEDICINES,
            "userProfile": {"allergies": "hidden-profile"},
            "sessionSummary": {"chiefComplaint": "hidden-summary"},
        },
    )
    route = next(call for call in calls if call["schema"] is IntentDecision)
    assert route["user"] == question
    assert route["history"] == [
        {"role": "user", "content": "我头痛"},
        {"role": "assistant", "content": "之前提到布洛芬"},
    ]
    assert "hidden-profile" not in str(route)
    assert "hidden-summary" not in str(route)
    messages = provider.native.inputs[0]
    assert [message.type for message in messages] == ["system", "human", "ai", "human"]
    assert messages[1].content == "我头痛"
    assert messages[2].content == "之前提到布洛芬"
    assert json.loads(messages[-1].content)["originalQuestion"] == question


def test_resolved_question_keeps_original_without_preprocessing(client, provider, monkeypatch):
    original = provider.structured

    async def structured(**kwargs):
        if kwargs["schema"] is IntentDecision:
            return IntentDecision(profile="medicine", content="家里有布洛芬吗？")
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(
        client,
        json={"sessionId": "resolved", "question": "这个有吗？", "medicines": SAMPLE_MEDICINES},
    ).json()
    payload = json.loads(provider.native.inputs[0][-1].content)
    assert payload["originalQuestion"] == "这个有吗？"
    assert payload["resolvedQuestion"] == "家里有布洛芬吗？"
    assert "normalizedQuestion" not in payload
    assert not {"medicine_plan", "preprocess", "parse", "review", "render"} & {
        step["nodeName"] for step in result["traces"]
    }
