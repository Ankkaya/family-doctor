# Family Doctor Platform

家庭药箱智能问药系统，已引入 `plateform-template` 的 NestJS 后端与 Vue3 后台管理基座，并和当前 Tauri React App、Python Agent 服务打通。

## 模块

| 路径 | 说明 |
| --- | --- |
| `app/` | 患者端 Tauri + React App，输入症状、展示推荐药品 |
| `frontend/` | 导入的 Vue3 + Naive UI 后台管理端，提供家庭药品汇总和问诊日志页面 |
| `backend/` | 导入的 NestJS + Prisma 后端，作为 App/Admin 的 BFF |
| `agent/` | Python FastAPI + LangGraph Agent 服务 |

## 调用链路

```text
Tauri App / Vue Admin
        |
        v
NestJS backend :13001
        |
        v
FastAPI Agent :18000
        |
        v
LLM Provider
```

App 主链路：

```text
app/src/stores/useAppStore.ts
  -> app/src/shared/api/app-api.ts
  -> POST /consultation/ask
  -> backend/src/domains/family-doctor/consultation
  -> backend/src/domains/family-doctor/agent-client
  -> agent/app/api/consult.py
```

## 本地启动

先启动基础设施：

```bash
npm run dev:infra
```

启动 Agent：

```bash
npm run dev:agent
```

启动后端：

```bash
cd backend
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm start:dev
```

启动后台管理端：

```bash
cd frontend
pnpm install
pnpm dev
```

启动患者端 App Web 预览：

```bash
cd app
npm install
npm run dev
```

默认访问：

- App Web: http://localhost:1420
- 后台管理: http://localhost:5173
- Docker 后台管理: http://localhost:18080
- 后端 API: http://localhost:13001
- Swagger: http://localhost:13001/api/docs
- Agent: http://localhost:18000/agent/health
- PostgreSQL: localhost:15432
- Redis: localhost:16379
- MinIO: http://localhost:19001

后台默认账号来自模板种子数据：`admin` / `123456`。

## 关键环境变量

- `backend/.env.development`
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:15432/platform_db?schema=public`
  - `AGENT_BASE_URL=http://127.0.0.1:18000`
  - `CORS_ORIGINS=http://localhost:5173,http://localhost:1420,...`
- `app/.env.development`
  - `VITE_API_BASE_URL=http://127.0.0.1:13001`

Agent 默认使用真实 OpenAI 兼容模型配置。需要离线联调时可显式设置 `LLM_PROVIDER=mock`。

## 新增接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/consultation/ask` | App 发起问诊，后端转发 Agent 并保存消息/trace |
| `GET` | `/medicine/cabinet` | App 查询当前家庭自维护药箱 |
| `POST` | `/medicine/cabinet` | App 新增当前家庭药品 |
| `PATCH` | `/medicine/cabinet/:inventoryId` | App 更新当前家庭药品 |
| `DELETE` | `/medicine/cabinet/:inventoryId` | App 删除当前家庭药品 |
| `GET` | `/admin/household-medicines` | 后台只读查询各家庭药品汇总 |
| `GET` | `/admin/consultations` | 后台问诊会话列表 |
| `GET` | `/admin/consultations/:id` | 后台问诊详情与 Agent Trace |
