# family-doctor-agent

家庭药箱问药 Agent 服务。FastAPI + LangGraph。被 NestJS 内部调用，不直接暴露给客户端。

唯一问诊执行接口 `/agent/ag-ui`（AG-UI / SSE）不再规划、确认或创建定时任务。提醒类意图仅返回个人中心定时任务入口引导，历史提醒方案的确认也不会触发创建。已有定时任务的管理接口、独立调度服务及 `/agent/jobs/*` 执行接口保持独立运行。

## 目录

问诊模型输入统一为 `system → 历史 user/assistant → 本轮 user`。历史来自后端此前已保存的会话记录，窗口最多 10 条，本轮问题单独传入；不按文字匹配删除历史。历史不再嵌入节点的用户提示词 JSON；摘要及会话状态继续作为结构化背景提供。模型完成后，后端在同一事务中保存本轮用户问题、助手回答、会话摘要与执行记录。

```
app/
  main.py            FastAPI 入口
  config.py          Settings (pydantic-settings)
  schemas.py         与 NestJS 对齐的 DTO
  tracing.py         节点 IO 追踪工具
  api/
    consult.py       POST /agent/ag-ui
    health.py        GET /agent/health
    medicine.py      POST /agent/medicine/recognize-images
  graph/
    state.py         LangGraph State
    builder.py       构图: preprocess -> parse -> emergency -> special_population -> match -> review -> safety -> summarize；图外流式 render
    nodes/
      parse.py       症状结构化
      match.py       药品召回 (纯 Python 关键词匹配, v1)
      risk.py        风险提示
      render.py      组装最终答复
  llm/
    provider.py      LLMProvider 抽象
    openai_provider.py OpenAI / DeepSeek 复用同一 OpenAI 兼容 SDK

prompts/consult.v1.md            问诊 Prompt
prompts/medicine_recognize.v1.md 图片识别 Prompt
tests/eval/             评测骨架
```

## 开发

推荐用 [uv](https://github.com/astral-sh/uv):

```bash
uv sync --all-extras
cp .env.example .env
uv run uvicorn app.main:app --reload --port 8000
```

或用 pip:

```bash
python -m venv .venv
. .venv/Scripts/activate   # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

默认使用真实 OpenAI 兼容模型。请在 `.env` 中配置 `LLM_PROVIDER`、`LLM_MODEL`、对应 API Key 和 Base URL。
当前示例配置使用 `LLM_PROVIDER=openai`、`LLM_MODEL=mimo-v2.5`、`OPENAI_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1`。

## 测试

```bash
uv run pytest
uv run python tests/eval/run_eval.py    # 跑离线评测集
```

## 契约

请求/响应 Pydantic 模型见 `app/schemas.py`。NestJS 侧的 `AgentClientService` 以此为准。

## 部署

```bash
docker build -t family-doctor-agent .
docker run --rm -p 8000:8000 --env-file .env family-doctor-agent
```
