import json

import pytest

from app.schemas import IntentDecision
from tests.agui import parse_events, post_consult, run_input
from tests.medicine_fakes import SAMPLE_MEDICINES


def force_general(provider, monkeypatch):
    original = provider.structured

    async def structured(**kwargs):
        if kwargs["schema"] is IntentDecision:
            return IntentDecision(profile="general", content="消解后的问题")
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)


def test_general_complete_model_reply_without_tools(client, provider, monkeypatch):
    force_general(provider, monkeypatch)
    provider.general_answer = "可以，到药品录入入口补录。"
    result = post_consult(
        client,
        json={
            "sessionId": "general",
            "question": "可以补录吗？",
            "historyMessages": [{"role": "USER", "content": "我想录药"}],
            "medicines": SAMPLE_MEDICINES,
            "userProfile": {"allergies": "hidden-profile"},
            "sessionSummary": {"symptoms": ["hidden-summary"]},
        },
    ).json()
    assert result["answer"] == provider.general_answer
    assert len(provider.chat_calls) == 1
    assert provider.native.calls == 0
    assert not provider.rewrites
    assert result["sessionSummary"]["symptoms"] == ["hidden-summary"]
    call = provider.chat_calls[0]
    assert call["history"] == [{"role": "user", "content": "我想录药"}]
    assert json.loads(call["user"]) == {
        "originalQuestion": "可以补录吗？",
        "resolvedQuestion": "消解后的问题",
    }
    assert "hidden-profile" not in str(call)
    assert "hidden-summary" not in str(call)


@pytest.mark.parametrize("answer", ['{"action":"medicine"}', '{"action":"emergency"}'])
def test_general_does_not_parse_action(client, provider, monkeypatch, answer):
    force_general(provider, monkeypatch)
    provider.general_answer = answer
    result = post_consult(client, json={"sessionId": "no-action", "question": "你好"}).json()
    assert result["answer"] == answer
    assert provider.native.calls == 0


def test_general_single_content_event(client, provider):
    provider.general_answer = "这是一次性回答。" * 20
    response = client.post(
        "/agent/ag-ui", json=run_input({"sessionId": "once", "question": "你好"})
    )
    events = parse_events(response.text.splitlines())
    content = [event for event in events if event["type"] == "TEXT_MESSAGE_CONTENT"]
    assert len(content) == 1
    assert content[0]["delta"] == provider.general_answer
    assert events[-1]["type"] == "RUN_FINISHED"
    assert len(provider.chat_calls) == 1


def test_general_empty_reply_is_error(client, provider):
    provider.general_answer = "  "
    response = client.post(
        "/agent/ag-ui", json=run_input({"sessionId": "empty", "question": "你好"})
    )
    events = parse_events(response.text.splitlines())
    assert events[-1]["type"] == "RUN_ERROR"
    assert "空回答" in events[-1]["message"]


def test_reminders_do_not_create_jobs(client, provider, monkeypatch):
    from app.tools.cron_job_tool import CronJobTool

    async def unexpected(*args, **kwargs):
        pytest.fail("Consultation must not create scheduled jobs")

    monkeypatch.setattr(CronJobTool, "create_job", unexpected)
    result = post_consult(
        client, json={"sessionId": "reminder", "question": "明天提醒我吃药"}
    ).json()
    assert "个人中心的定时任务" in result["answer"]
    assert provider.native.calls == 0
