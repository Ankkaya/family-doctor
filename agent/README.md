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
    builder.py       medicine 执行入口，无任务规划和三类任务路径
    nodes/general.py general 一次性文本回复
  medicine/
    agent.py         LangChain create_agent；注册工具，主模型最多两次
    tools.py         权限受限药品查询工具，返回记录或具体失败原因
    runtime.py       每轮独立上下文、记录及执行追踪
  llm/
    provider.py      LLMProvider 抽象
    openai_provider.py OpenAI / DeepSeek 复用同一 OpenAI 兼容 SDK

prompts/medicine.system.v2.md    medicine 主提示词
prompts/medicine_rewrite.system.v1.md 检索切题评估与重写提示词
prompts/general.system.v2.md     general 主提示词
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

## medicine 调用预算

主模型通过 LangChain 原生工具调用查询药品，`ModelCallLimitMiddleware(run_limit=2)` 限制每轮最多两次实际主模型调用，工具后的续答也计入。不再执行任务规划、固定症状解析/适配审查链或额外 render 模型。
`search_household_cabinet` 内部依次完成检索、切题评估与必要的参数重写。切题则返回回答及已验证 ID 的引用；第 1 轮不切题（含零结果）则用辅助模型生成的 query 直接再次检索，第 2 轮结束。每次工具调用最多检索 2 轮、评估 2 次、重写 1 次，不回到主模型、不追加 HumanMessage。主模型最多 2 次（调用工具、读取最终结果回复），与工具内部预算独立。未采纳记录仅保留执行追踪。
第2次主模型仍请求工具时，工具可完成执行，然后直接用工具结果或失败原因形成答复，不请求第3次主模型。查询失败明确区分无匹配、无可用库存、权限错误和服务异常。
药品记录仅作资料引用，不自动产生推荐卡片；系统提示词负责用药风险提醒及缺失信息澄清，不能把查询结果当作适用性结论。
