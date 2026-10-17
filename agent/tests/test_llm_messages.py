from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from pydantic import BaseModel

from app.llm.messages import conversation_history
from app.llm.openai_provider import OpenAICompatProvider
from app.schemas import ConversationMessageBrief


def message(role: str, content: str) -> ConversationMessageBrief:
    return ConversationMessageBrief(role=role, content=content)


def test_history_preserves_roles_and_identical_prior_questions() -> None:
    history = conversation_history([
        message("USER", "这个能吃吗"), message("ASSISTANT", "请补充过敏史"),
        message("USER", "这个能吃吗"),
    ])
    assert history == [
        {"role": "user", "content": "这个能吃吗"},
        {"role": "assistant", "content": "请补充过敏史"},
        {"role": "user", "content": "这个能吃吗"},
    ]


def test_history_caps_window_and_keeps_distinct_final_user_message() -> None:
    history = conversation_history([message("USER", str(index)) for index in range(15)])
    assert len(history) == 10
    assert history[0]["content"] == "5"
    assert history[-1]["content"] == "14"


class Output(BaseModel):
    answer: str


@pytest.mark.asyncio
@pytest.mark.parametrize("mode", ["chat", "structured", "chat_stream"])
async def test_provider_sends_real_role_messages_to_sdk(mode: str) -> None:
    provider = OpenAICompatProvider(api_key="test-key", base_url="http://unused.invalid/v1", model="test")
    history = [{"role": "user", "content": "我头痛"}, {"role": "assistant", "content": "持续多久了？"}]

    async def stream():
        yield SimpleNamespace(choices=[SimpleNamespace(delta=SimpleNamespace(content="回复"))])

    response = stream() if mode == "chat_stream" else SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='{"answer":"回复"}'))])
    create = AsyncMock(return_value=response)
    provider._client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    if mode == "structured":
        assert (await provider.structured(system="系统指令", user="两天", history=history, schema=Output)).answer == "回复"
    elif mode == "chat_stream":
        assert "".join([chunk async for chunk in provider.chat_stream(system="系统指令", user="两天", history=history)]) == "回复"
    else:
        await provider.chat(system="系统指令", user="两天", history=history)
    sent = create.call_args.kwargs["messages"]
    assert [item["role"] for item in sent] == ["system", "user", "assistant", "user"]
    assert sent[1:3] == history
    assert sent[-1]["content"] == "两天"
    assert sent[0]["content"].startswith("系统指令")


@pytest.mark.asyncio
async def test_new_conversation_has_only_system_and_current_user() -> None:
    provider = OpenAICompatProvider(api_key="test-key", base_url="http://unused.invalid/v1", model="test")
    create = AsyncMock(return_value=SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content="ok"))]))
    provider._client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    await provider.chat(system="系统指令", user="问题")
    assert create.call_args.kwargs["messages"] == [
        {"role": "system", "content": "系统指令"}, {"role": "user", "content": "问题"},
    ]
