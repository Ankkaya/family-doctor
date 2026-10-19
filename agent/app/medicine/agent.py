from __future__ import annotations

import json

from langchain.agents import create_agent
from langchain.agents.middleware import ModelCallLimitMiddleware
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from ..config import Settings
from ..graph.context import history_chat_messages
from ..llm.provider import LLMProvider
from ..prompting import load_prompt
from ..schemas import SessionSummary
from ..tracing import trace_node
from .runtime import MedicineRun
from .tools import cabinet_tool

MEDICINE_SYSTEM = load_prompt("medicine.system.v2.md")


def make_medicine_node(llm: LLMProvider, settings: Settings):
    async def medicine(state):
        run = MedicineRun(
            original_question=state["question"],
            resolved_question=state.get("resolved_question") or state["question"],
        )
        messages = [
            HumanMessage(content=item["content"])
            if item["role"] == "user"
            else AIMessage(content=item["content"])
            for item in history_chat_messages(state)
        ]
        user = {
            "originalQuestion": run.original_question,
            "resolvedQuestion": run.resolved_question,
            "allowRxRecommendation": bool(state.get("allow_rx_recommendation")),
            "userProfile": state["user_profile"].model_dump(by_alias=True)
            if state.get("user_profile")
            else None,
            "sessionSummary": state["session_summary"].model_dump(by_alias=True)
            if state.get("session_summary")
            else None,
        }
        run.context = {**user, "historyMessages": history_chat_messages(state)}
        messages.append(HumanMessage(content=json.dumps(user, ensure_ascii=False)))
        # All iterations share one invocation and its run_model_call_count.
        agent = create_agent(
            model=llm.agent_model(),
            tools=[
                cabinet_tool(
                    settings=settings, scope=state.get("cabinet_scope") or "", run=run, llm=llm
                )
            ],
            system_prompt=MEDICINE_SYSTEM,
            middleware=[
                ModelCallLimitMiddleware(run_limit=2, exit_behavior="end"),
            ],
        )
        with trace_node(
            "medicine",
            {
                "promptKey": "consult.medicine.system",
                "promptVersion": "v2",
                "systemPrompt": MEDICINE_SYSTEM,
                "userPrompt": user,
                "historyMessages": history_chat_messages(state),
                "mainModelLimit": 2,
            },
        ) as rec:
            result = await agent.ainvoke({"messages": messages}, config={"recursion_limit": 60})
            run.responses = [
                msg for msg in result["messages"][len(messages) :] if isinstance(msg, AIMessage)
            ][:2]
            for message in result["messages"][len(messages) :]:
                if isinstance(message, ToolMessage) and message.status == "error":
                    run.lookups.append(
                        {
                            "status": "error",
                            "reasonCode": "INVALID_QUERY",
                            "reason": "药品查询参数不合法或调用了未注册的工具，请补充有效药名或症状。",
                            "items": [],
                        }
                    )
            last = run.responses[-1] if run.responses else None
            text = last.text.strip() if last and not last.tool_calls else ""
            text = text or run.accepted_answer
            if run.no_result:
                reasons = list(
                    dict.fromkeys(item["reason"] for item in run.lookups if item.get("reason"))
                )
                if reasons:
                    answer = "未查到药品。原因：" + "；".join(reasons)
                else:
                    answer = "未查到药品：未取得切题且可引用的查询结果，请补充完整药名或症状描述。"
                if run.evaluations and not run.evaluations[-1]["relevant"]:
                    answer += " 评估说明：" + run.evaluations[-1]["reason"]
                if run.rewrite_failed:
                    answer += " 切题评估与重写服务暂不可用，本次未采用未验证结果。"
            else:
                answer = text
                answer += (
                    "\n\n药品资料来源：家庭药箱（用户维护）；"
                    + "、".join(item.name for item in run.candidates.values())
                    + "。"
                )
            summary = (state.get("session_summary") or SessionSummary()).model_copy(
                update={
                    "last_topic": run.resolved_question[:80],
                    "mentioned_medicines": list(
                        dict.fromkeys(
                            [
                                *(
                                    state["session_summary"].mentioned_medicines
                                    if state.get("session_summary")
                                    else []
                                ),
                                *[item.name for item in run.candidates.values()],
                            ]
                        )
                    ),
                }
            )
            rec.set_output(
                {
                    "mainModelCalls": result.get("run_model_call_count", len(run.responses)),
                    "mainModelLimit": 2,
                    "rewritten": run.rewritten,
                    "lookupResults": run.lookups,
                    "evaluations": run.evaluations,
                    "references": [
                        item.model_dump(by_alias=True) for item in run.candidates.values()
                    ],
                    "answer": answer,
                    "modelReturns": [
                        {"content": msg.content, "toolCalls": msg.tool_calls}
                        for msg in run.responses
                    ],
                }
            )
            rec.set_llm(model=llm.model)
        return {
            "answer": answer,
            "recommends": [],
            "candidates": list(run.candidates.values()),
            "updated_session_summary": summary,
            "traces": [*run.traces, rec.step],
        }

    return medicine
