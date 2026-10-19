from __future__ import annotations

import json
from typing import Annotated, Literal

from langchain_core.tools import tool
from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from ..config import Settings
from ..llm.provider import LLMProvider
from ..prompting import load_prompt
from ..schemas import MedicineBrief
from ..tools.cabinet_lookup import CabinetToolCall, search_household_cabinet
from ..tracing import trace_node
from .runtime import MedicineRun


class MedicineQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    mode: Literal["name", "symptom", "inventory"]
    names: list[str] = Field(default_factory=list, max_length=10)
    symptoms: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def validate_query(self):
        CabinetToolCall(tool="search_household_cabinet", **self.model_dump())
        return self


class RetrievalEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    relevant: bool
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
    answer: Annotated[str, StringConstraints(strip_whitespace=True, max_length=8000)]
    reference_ids: list[str] = Field(max_length=40)
    question: Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]
    query: MedicineQuery | None


EVALUATION_SYSTEM = load_prompt("medicine_rewrite.system.v1.md")


def cabinet_tool(*, settings: Settings, scope: str, run: MedicineRun, llm: LLMProvider):
    async def retrieve(query: MedicineQuery) -> dict:
        with trace_node("medicine_lookup", query.model_dump()) as rec:
            try:
                items = await search_household_cabinet(
                    settings=settings,
                    scope=scope,
                    call=CabinetToolCall(tool="search_household_cabinet", **query.model_dump()),
                )
                if items:
                    result = {
                        "status": "found",
                        "reasonCode": None,
                        "reason": None,
                        "items": [item.model_dump(by_alias=True) for item in items],
                    }
                else:
                    code, reason = {
                        "name": (
                            "EXACT_NAME_NOT_FOUND",
                            "当前家庭可用库存中没有药名或别名的精确匹配；已删除、无库存及过期记录不在查询范围。",
                        ),
                        "symptom": (
                            "NO_SIMILARITY_MATCH",
                            "当前家庭可用库存中未找到达到相似度阈值的症状相关药品。",
                        ),
                        "inventory": (
                            "NO_AVAILABLE_INVENTORY",
                            "当前家庭没有可返回的可用库存记录；已删除、无库存及过期记录不在查询范围。",
                        ),
                    }[query.mode]
                    result = {
                        "status": "no_match",
                        "reasonCode": code,
                        "reason": reason,
                        "items": [],
                    }
            except ValueError as exc:
                detail = str(exc)
                if "授权" in detail:
                    code, reason = "AUTHORIZATION_FAILED", "药箱查询授权已失效，请重新发起问诊"
                elif "Embedding" in detail:
                    code, reason = (
                        "EMBEDDING_UNAVAILABLE",
                        "药箱语义检索未配置或 Embedding 服务暂不可用",
                    )
                else:
                    code, reason = (
                        "LOOKUP_UNAVAILABLE",
                        "药品查询服务暂不可用，不能据此判断药品是否存在。",
                    )
                result = {"status": "error", "reasonCode": code, "reason": reason, "items": []}
            except Exception:
                result = {
                    "status": "error",
                    "reasonCode": "LOOKUP_UNAVAILABLE",
                    "reason": "药品查询服务暂不可用，不能据此判断药品是否存在。",
                    "items": [],
                }
            run.lookups.append({"query": query.model_dump(), **result})
            rec.set_output(result)
        run.traces.append(rec.step)
        return result

    @tool("search_household_cabinet", args_schema=MedicineQuery)
    async def lookup(mode: str, names: list[str] | None = None, symptoms: str = "") -> dict:
        """查询授权家庭药品，内部评估是否切题，必要时重写参数并重查一次。name 精确药名/别名，symptom 症状语义，inventory 可用库存；返回最终回答、真实引用或具体失败原因。"""
        initial = query = MedicineQuery(mode=mode, names=names or [], symptoms=symptoms)
        rewritten_question = run.resolved_question
        for round_number in (1, 2):
            result = await retrieve(query)
            payload = {
                "originalQuestion": run.original_question,
                "resolvedQuestion": run.resolved_question,
                "rewrittenQuestion": rewritten_question,
                "query": query.model_dump(),
                "lookupResults": [{"query": query.model_dump(), **result}],
                "retrievalRound": round_number,
                "canRewrite": round_number < 2,
                "context": run.context,
            }
            available = {item["id"]: item for item in result["items"]}
            failed = False
            with trace_node(
                "retrieval_evaluation",
                {
                    "promptKey": "consult.medicine_rewrite.system",
                    "promptVersion": "v1",
                    "systemPrompt": EVALUATION_SYSTEM,
                    "userPrompt": payload,
                },
            ) as rec:
                try:
                    evaluation = await llm.structured(
                        system=EVALUATION_SYSTEM,
                        user=json.dumps(payload, ensure_ascii=False),
                        schema=RetrievalEvaluation,
                    )
                    if evaluation.relevant:
                        if (
                            not available
                            or not evaluation.answer
                            or not evaluation.reference_ids
                            or any(key not in available for key in evaluation.reference_ids)
                        ):
                            raise ValueError("Invalid grounded evaluation")
                        accepted = {
                            key: MedicineBrief.model_validate(available[key])
                            for key in evaluation.reference_ids
                        }
                        run.candidates.update(accepted)
                        run.accepted_answer = evaluation.answer
                        result = {
                            "status": "found",
                            "reasonCode": None,
                            "reason": None,
                            "answer": evaluation.answer,
                            "items": [item.model_dump(by_alias=True) for item in accepted.values()],
                            "retrievalRounds": round_number,
                        }
                    elif round_number < 2:
                        retry = evaluation.query
                        if not evaluation.question or retry is None:
                            raise ValueError("Missing rewritten query")
                        if retry.mode != initial.mode or (
                            initial.mode == "name" and retry.names != initial.names
                        ):
                            raise ValueError("Rewrite changed original query constraints")
                    run.evaluations.append(evaluation.model_dump())
                    rec.set_output(evaluation.model_dump())
                    rec.set_llm(model=llm.model)
                except Exception:
                    failed = True
                    run.rewrite_failed = True
                    rec.set_output({"error": "切题评估与重写服务不可用，本次不采用未验证结果。"})
            run.traces.append(rec.step)
            if failed:
                return {
                    "status": "error",
                    "reasonCode": "EVALUATION_UNAVAILABLE",
                    "reason": "切题评估与重写服务暂不可用，本次未采用未验证结果。",
                    "items": [],
                    "retrievalRounds": round_number,
                }
            if evaluation.relevant:
                return result
            if round_number == 2:
                return {
                    "status": "no_match" if result["status"] != "error" else "error",
                    "reasonCode": result["reasonCode"] or "IRRELEVANT_RESULTS",
                    "reason": (result["reason"] or "未查到切题的药品结果")
                    + "；"
                    + evaluation.reason,
                    "items": [],
                    "retrievalRounds": round_number,
                }
            run.rewritten = True
            rewritten_question, query = evaluation.question, evaluation.query
        raise AssertionError("Unreachable retrieval round")

    return lookup
