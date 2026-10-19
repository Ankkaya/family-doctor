from __future__ import annotations

import json

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from pydantic import Field

from app.medicine.tools import MedicineQuery, RetrievalEvaluation
from app.schemas import IntentDecision, RecognizeMedicineImagesResponse

SAMPLE_MEDICINES = [
    {
        "id": "ibu",
        "name": "布洛芬",
        "otc": "OTC",
        "indication": "头痛、发热",
        "quantity": 3,
        "expireAt": "2027-10-01",
    }
]


def tool_call(mode="name", names=None, symptoms="", call_id="lookup-1"):
    return AIMessage(
        content="",
        tool_calls=[
            {
                "name": "search_household_cabinet",
                "args": {"mode": mode, "names": names or [], "symptoms": symptoms},
                "id": call_id,
                "type": "tool_call",
            }
        ],
    )


class ScriptedModel(BaseChatModel):
    responses: list[AIMessage] = Field(
        default_factory=lambda: [
            tool_call("name", ["布洛芬"]),
            AIMessage(content="已查询到药箱记录，请结合药品说明书和药师意见使用。"),
        ]
    )
    calls: int = 0
    inputs: list = Field(default_factory=list)
    registered_tools: list = Field(default_factory=list)

    @property
    def _llm_type(self):
        return "scripted-medicine-test"

    def bind_tools(self, tools, **kwargs):
        self.registered_tools = tools
        return self

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        self.inputs.append(messages)
        response = self.responses[min(self.calls, len(self.responses) - 1)].model_copy(deep=True)
        self.calls += 1
        return ChatResult(generations=[ChatGeneration(message=response)])

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        return self._generate(messages, stop=stop, run_manager=run_manager, **kwargs)


class FakeProvider:
    def __init__(self, model="test-model", native=None):
        self.model = model
        self.native = native or ScriptedModel()
        self.rewrites = []
        self.evaluations = []
        self.chat_calls = []
        self.general_answer = "请到个人中心的定时任务中查看和管理提醒。"

    def agent_model(self):
        return self.native

    async def chat(self, **kwargs):
        self.chat_calls.append(kwargs)
        return self.general_answer

    async def chat_stream(self, **kwargs):
        raise AssertionError("No additional render model is allowed")
        yield ""

    async def structured(self, *, system, user, schema, history=None):
        if schema is IntentDecision:
            general = any(word in user for word in ["你好", "提醒", "确认", "定时", "哪里买"])
            return IntentDecision(profile="general" if general else "medicine", content=user)
        if schema is RetrievalEvaluation:
            data = json.loads(user)
            self.evaluations.append(data)
            items = [
                item
                for lookup in data["lookupResults"]
                if lookup["status"] == "found"
                for item in lookup["items"]
            ]
            if items:
                return RetrievalEvaluation(
                    relevant=True,
                    reason="结果切题",
                    answer="已查询到布洛芬，记录有效期2027-10-01。",
                    reference_ids=[item["id"] for item in items],
                    question="",
                    query=None,
                )
            if data["canRewrite"]:
                self.rewrites.append(data)
            return RetrievalEvaluation(
                relevant=False,
                reason="未取得切题记录",
                answer="",
                reference_ids=[],
                question=data["originalQuestion"] + "，请根据失败原因重新查询。"
                if data["canRewrite"]
                else "",
                query=MedicineQuery.model_validate(data["query"]) if data["canRewrite"] else None,
            )
        raise AssertionError(f"Unexpected model call: {schema}")

    async def structured_with_images(self, *, schema, **kwargs):
        assert schema is RecognizeMedicineImagesResponse
        return schema(name="测试药品", confidence=0.9)
