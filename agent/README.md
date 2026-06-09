# family-doctor-agent

家庭药箱问药 Agent 服务。FastAPI + LangGraph。被 NestJS 内部调用，不直接暴露给客户端。

## 目录

```
app/
  main.py            FastAPI 入口
  config.py          Settings (pydantic-settings)
  schemas.py         与 NestJS 对齐的 DTO
  tracing.py         节点 IO 追踪工具
  api/
    consult.py       POST /agent/consult
    health.py        GET /agent/health
    medicine.py      POST /agent/medicine/recognize-images
  graph/
    state.py         LangGraph State
    builder.py       构图: parse -> match -> risk -> render
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
