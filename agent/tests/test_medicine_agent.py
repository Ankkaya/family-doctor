import json

import pytest
from langchain_core.messages import AIMessage

from app.medicine.tools import MedicineQuery
from app.schemas import MedicineBrief
from tests.agui import post_consult
from tests.medicine_fakes import SAMPLE_MEDICINES, ScriptedModel, tool_call


def medicine_trace(result):
    return next(item for item in result["traces"] if item["nodeName"] == "medicine")["output"]


def test_native_tool_registration_and_budget(client, provider):
    result = post_consult(
        client, json={"sessionId": "success", "question": "查布洛芬", "medicines": SAMPLE_MEDICINES}
    ).json()
    assert provider.native.calls == 2
    assert medicine_trace(result)["mainModelCalls"] == 2
    assert not provider.rewrites
    tool = provider.native.registered_tools[0]
    assert tool.name == "search_household_cabinet"
    assert set(tool.args) == {"mode", "names", "symptoms"}
    assert "scope" not in tool.args


def test_no_result_rewrites_original_and_model_return_before_second_lookup(
    client, provider, monkeypatch
):
    provider.native = ScriptedModel(
        responses=[tool_call("name", ["布洛芬"]), AIMessage(content="查询完成。")]
    )
    calls = []

    async def lookup(**kwargs):
        calls.append(kwargs)
        return [] if len(calls) == 1 else [MedicineBrief.model_validate(SAMPLE_MEDICINES[0])]

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", lookup)
    result = post_consult(
        client, json={"sessionId": "retry", "question": "原问题：家里有布洛芬吗"}
    ).json()
    assert provider.native.calls == 2
    assert len(calls) == 2
    assert len(provider.rewrites) == 1
    rewrite = provider.rewrites[0]
    assert rewrite["originalQuestion"] == "原问题：家里有布洛芬吗"
    assert rewrite["query"]["names"] == ["布洛芬"]
    assert rewrite["lookupResults"][0]["reasonCode"] == "EXACT_NAME_NOT_FOUND"
    assert provider.native.inputs[1][-1].type == "tool"
    assert "retrievalRounds" in provider.native.inputs[1][-1].content
    assert "布洛芬" in result["answer"]
    assert "2027-10-01" in medicine_trace(result)["evaluations"][-1]["answer"]
    assert medicine_trace(result)["mainModelCalls"] == 2
    assert medicine_trace(result)["rewritten"] is True


@pytest.mark.parametrize(
    "mode,names,symptoms,code,reason",
    [
        ("name", ["布洛芬"], "", "EXACT_NAME_NOT_FOUND", "精确匹配"),
        ("symptom", [], "头痛", "NO_SIMILARITY_MATCH", "相似度阈值"),
        ("inventory", [], "", "NO_AVAILABLE_INVENTORY", "可用库存"),
    ],
)
def test_two_empty_queries_stop_with_concrete_reason(
    client, provider, mode, names, symptoms, code, reason
):
    provider.native = ScriptedModel(
        responses=[tool_call(mode, names, symptoms), AIMessage(content="查询完成。")]
    )
    result = post_consult(
        client, json={"sessionId": "empty", "question": "查询药品", "medicines": []}
    ).json()
    assert provider.native.calls == 2
    assert len(provider.rewrites) == 1
    trace = medicine_trace(result)
    assert len(trace["lookupResults"]) == 2
    assert all(item["reasonCode"] == code for item in trace["lookupResults"])
    assert reason in result["answer"]
    assert "model call limit" not in result["answer"].lower()
    assert trace["mainModelCalls"] == 2


def test_no_tool_is_not_reported_as_search_success(client, provider):
    provider.native = ScriptedModel(responses=[AIMessage(content="请补充药名。")])
    result = post_consult(client, json={"sessionId": "no-tool", "question": "找个药"}).json()
    assert provider.native.calls == 1
    assert not provider.rewrites
    assert not provider.evaluations
    assert "未取得切题且可引用" in result["answer"]
    assert "来源：家庭药箱" not in result["answer"]


def test_rewrite_failure_stops_without_resetting_or_fabricating_results(
    client, provider, monkeypatch
):
    original = provider.structured

    async def structured(**kwargs):
        if kwargs["schema"].__name__ == "RetrievalEvaluation":
            raise RuntimeError("private-provider-error")
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(
        client, json={"sessionId": "rewrite-failed", "question": "查布洛芬", "medicines": []}
    ).json()
    assert provider.native.calls == 2
    assert "切题评估与重写服务暂不可用" in result["answer"]
    assert "精确匹配" in result["answer"]
    assert "private-provider-error" not in json.dumps(result)
    assert all(item is not None for item in result["traces"])


@pytest.mark.parametrize(
    "error,code",
    [
        ("药箱查询授权已失效，请重新发起问诊", "AUTHORIZATION_FAILED"),
        ("药箱语义检索未配置或 Embedding 服务暂不可用", "EMBEDDING_UNAVAILABLE"),
    ],
)
def test_service_failure_is_distinct_from_not_found(client, provider, monkeypatch, error, code):
    async def fail(**kwargs):
        raise ValueError(error)

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", fail)
    result = post_consult(client, json={"sessionId": "failure", "question": "查药"}).json()
    assert medicine_trace(result)["lookupResults"][0]["status"] == "error"
    assert medicine_trace(result)["lookupResults"][0]["reasonCode"] == code
    assert error in result["answer"]
    assert provider.native.calls == 2


def test_invalid_tool_args_are_reported_without_querying_another_household(
    client, provider, monkeypatch
):
    response = tool_call("name", ["布洛芬"])
    response.tool_calls[0]["args"]["householdId"] = "other-family"
    provider.native = ScriptedModel(responses=[response])

    async def forbidden(**kwargs):
        pytest.fail("Invalid arguments must not reach backend")

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", forbidden)
    result = post_consult(client, json={"sessionId": "bad-args", "question": "查药"}).json()
    assert provider.native.calls == 2
    assert medicine_trace(result)["lookupResults"][0]["reasonCode"] == "INVALID_QUERY"
    assert "查询参数不合法" in result["answer"]


def test_budget_is_per_round_and_not_shared_between_requests(client, provider):
    provider.native = ScriptedModel(
        responses=[tool_call("name", ["布洛芬"]), AIMessage(content="查询完成。")] * 2
    )
    for session in ["round-1", "round-2"]:
        result = post_consult(
            client, json={"sessionId": session, "question": "查布洛芬", "medicines": []}
        ).json()
        assert medicine_trace(result)["mainModelCalls"] == 2
    assert provider.native.calls == 4
    assert len(provider.rewrites) == 2
    assert [message.type for message in provider.native.inputs[2]] == ["system", "human"]


def test_irrelevant_records_retry_then_only_accept_second_references(client, provider, monkeypatch):
    from app.medicine.tools import RetrievalEvaluation

    provider.native = ScriptedModel(
        responses=[tool_call("name", ["布洛芬"]), AIMessage(content="查询完成。")]
    )
    original = provider.structured
    evaluations = []
    lookups = []

    async def lookup(**kwargs):
        lookups.append(kwargs)
        item = dict(SAMPLE_MEDICINES[0])
        item["id"] = "rejected" if len(lookups) == 1 else "accepted"
        item["name"] = "不相关药品" if len(lookups) == 1 else "布洛芬"
        return [MedicineBrief.model_validate(item)]

    async def structured(**kwargs):
        if kwargs["schema"] is RetrievalEvaluation:
            data = json.loads(kwargs["user"])
            evaluations.append(data)
            if len(evaluations) == 1:
                return RetrievalEvaluation(
                    relevant=False,
                    reason="记录未回答原问题",
                    answer="",
                    reference_ids=[],
                    question="查找原问题对应药品",
                    query=MedicineQuery.model_validate(data["query"]),
                )
        return await original(**kwargs)

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", lookup)
    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(client, json={"sessionId": "off-topic", "question": "查布洛芬"}).json()
    trace = medicine_trace(result)
    assert provider.native.calls == 2
    assert len(evaluations) == 2
    assert [item["id"] for item in trace["references"]] == ["accepted"]
    assert result["sessionSummary"]["mentionedMedicines"] == ["布洛芬"]
    assert "不相关药品" not in result["answer"]


def test_second_irrelevant_result_ends_without_third_round(client, provider, monkeypatch):
    from app.medicine.tools import RetrievalEvaluation

    provider.native = ScriptedModel(
        responses=[tool_call("name", ["布洛芬"]), AIMessage(content="查询完成。")]
    )
    original = provider.structured
    evaluations = []

    async def structured(**kwargs):
        if kwargs["schema"] is RetrievalEvaluation:
            data = json.loads(kwargs["user"])
            evaluations.append(data)
            return RetrievalEvaluation(
                relevant=False,
                reason="资料不能回答原问题",
                answer="",
                reference_ids=[],
                question="重查原问题" if data["canRewrite"] else "",
                query=MedicineQuery.model_validate(data["query"]) if data["canRewrite"] else None,
            )
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(
        client,
        json={"sessionId": "irrelevant-twice", "question": "查药", "medicines": SAMPLE_MEDICINES},
    ).json()
    assert provider.native.calls == 2
    assert len(evaluations) == 2
    assert evaluations[-1]["canRewrite"] is False
    assert not medicine_trace(result)["references"]
    assert result["sessionSummary"]["mentionedMedicines"] == []
    assert "资料不能回答原问题" in result["answer"]
    assert "来源：家庭药箱" not in result["answer"]


@pytest.mark.parametrize("items,ids", [([], ["ibu"]), (SAMPLE_MEDICINES, ["invented"])])
def test_cannot_accept_empty_results_or_invented_citations(
    client, provider, monkeypatch, items, ids
):
    from app.medicine.tools import RetrievalEvaluation

    original = provider.structured

    async def structured(**kwargs):
        if kwargs["schema"] is RetrievalEvaluation:
            return RetrievalEvaluation(
                relevant=True,
                reason="声称切题",
                answer="伪造回答正文",
                reference_ids=ids,
                question="",
                query=None,
            )
        return await original(**kwargs)

    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(
        client, json={"sessionId": "invalid-citation", "question": "查药", "medicines": items}
    ).json()
    assert "伪造回答正文" not in result["answer"]
    assert not medicine_trace(result)["references"]
    assert "切题评估与重写服务暂不可用" in result["answer"]


def test_rewritten_query_executes_inside_one_tool_call_before_main_resumes(
    client, provider, monkeypatch
):
    from app.medicine.tools import RetrievalEvaluation

    provider.native = ScriptedModel(
        responses=[tool_call("symptom", symptoms="脑袋疼"), AIMessage(content="请参考查询结果。")]
    )
    original = provider.structured
    queries = []
    phases = []

    async def lookup(**kwargs):
        assert provider.native.calls == 1
        queries.append(kwargs["call"].symptoms)
        phases.append("lookup")
        return [] if len(queries) == 1 else [MedicineBrief.model_validate(SAMPLE_MEDICINES[0])]

    async def structured(**kwargs):
        if kwargs["schema"] is RetrievalEvaluation:
            assert provider.native.calls == 1
            phases.append("evaluate")
            data = json.loads(kwargs["user"])
            if data["retrievalRound"] == 1:
                return RetrievalEvaluation(
                    relevant=False,
                    reason="用规范症状词重查",
                    answer="",
                    reference_ids=[],
                    question="头痛有什么药",
                    query=MedicineQuery(mode="symptom", symptoms="头痛"),
                )
        return await original(**kwargs)

    monkeypatch.setattr("app.medicine.tools.search_household_cabinet", lookup)
    monkeypatch.setattr(provider, "structured", structured)
    result = post_consult(
        client, json={"sessionId": "internal-loop", "question": "脑袋疼有什么药"}
    ).json()
    assert queries == ["脑袋疼", "头痛"]
    assert phases == ["lookup", "evaluate", "lookup", "evaluate"]
    assert provider.native.calls == 2
    assert [msg.type for msg in provider.native.inputs[1]] == ["system", "human", "ai", "tool"]
    output = json.loads(provider.native.inputs[1][-1].content)
    assert output["retrievalRounds"] == 2
    assert output["status"] == "found"
    assert output["answer"]
    assert medicine_trace(result)["references"][0]["id"] == "ibu"


def test_main_model_limit_still_applies_when_it_keeps_calling_tools(client, provider):
    provider.native = ScriptedModel(responses=[tool_call("name", ["布洛芬"])])
    result = post_consult(
        client,
        json={"sessionId": "main-limit", "question": "查布洛芬", "medicines": SAMPLE_MEDICINES},
    ).json()
    assert provider.native.calls == 2
    assert medicine_trace(result)["mainModelCalls"] == 2
    assert "model call limit" not in result["answer"].lower()
    assert "布洛芬" in result["answer"]
