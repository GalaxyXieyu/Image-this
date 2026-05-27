# Architecture

**Analysis Date:** 2026-05-26

## Pattern Overview

**Overall:** Electron 桌面壳承载的全栈单体应用，运行时由主进程拉起内嵌 Next.js standalone 子进程，再由前端页面通过本地 HTTP API 和数据库进行任务驱动。

**Key Characteristics:**
- 单仓同时包含桌面端、Web API、数据库 schema、打包脚本
- 任务处理基于数据库队列和 API 路由触发
- 本地文件系统承担结果存储职责
- Windows 打包链路需要手工拼装 Prisma、sharp 与 standalone 资源

## Layers

**Desktop Runtime Layer:**
- Purpose: 启动 Electron、准备数据库、拉起 Next 子进程、处理桌面级 IPC 和自动更新
- Contains: `electron/main.js`, `electron/database-manager.js`, `electron/preload.js`, `electron/update-manager.js`
- Depends on: Node.js built-ins、打包后的 standalone 产物、桌面文件系统
- Used by: 用户直接启动桌面应用

**HTTP/API Layer:**
- Purpose: 对前端暴露任务、设置、历史、模型、文件访问等接口
- Contains: `src/app/api/**/route.ts`
- Depends on: Auth、Prisma、storage、image processor
- Used by: Next.js 页面、Electron 内嵌前端、任务恢复逻辑

**Business Logic Layer:**
- Purpose: 图片处理、工作流编排、provider 调用、任务处理与用户配置读取
- Contains: `src/lib/**`, `src/lib/image-processor/**`, `src/app/api/*/service.ts`
- Depends on: 外部 AI provider、本地文件存储、Prisma
- Used by: API 路由和任务 worker

**Persistence Layer:**
- Purpose: 管理 SQLite 数据、任务表、图片记录、用户配置和本地文件
- Contains: `src/lib/prisma.ts`, `prisma/schema.prisma`, `src/lib/storage.ts`, `src/lib/local-storage.ts`
- Depends on: Prisma、SQLite 文件、文件系统
- Used by: API 路由、worker、桌面数据库初始化

## Data Flow

**Desktop Startup Flow:**

1. 用户启动 Electron 应用
2. `electron/main.js` 创建窗口并准备日志与环境变量
3. `ensureDesktopDatabaseReady()` 校验或修复 SQLite 模板库
4. 主进程 `fork()` 打包后的 `.next/standalone/server.js`
5. 通过 `/api/health` 等探活后加载主页面

**Task Processing Flow:**

1. 前端页面调用 `/api/tasks` 创建任务，任务数据写入 `task_queue`
2. 页面或恢复逻辑调用 `/api/tasks/worker`
3. worker 从 `task_queue` 取 `PENDING` 任务，按类型调用图像处理 service
4. 处理结果写入本地文件与 `processed_images` / `task_queue.outputData`
5. 前端轮询 `/api/tasks` 获取进度并更新 UI

**State Management:**
- 服务端状态主要落在 SQLite
- 客户端页面状态用 React state + Zustand
- worker 没有真正独立的常驻调度器，状态推进依赖 API 调用触发

## Key Abstractions

**TaskQueue:**
- Purpose: 表示需要异步消费的业务任务
- Examples: `TaskQueue` Prisma model, `/api/tasks`, `/api/tasks/worker`
- Pattern: 数据库队列 + API 触发式处理器

**Image Processor Provider:**
- Purpose: 封装不同 AI 提供商的图像处理调用
- Examples: `src/lib/image-processor/providers/gemini.ts`, `gpt.ts`, `volcengine.ts`, `jimeng.ts`
- Pattern: provider-specific adapter

**Desktop Runtime Bootstrap:**
- Purpose: 统一桌面端数据库、子进程服务、窗口和更新逻辑
- Examples: `bootstrapApplication()`, `startNextServer()`
- Pattern: 主进程 orchestrator

## Entry Points

**Electron Entry:**
- Location: `electron/main.js`
- Triggers: 用户启动桌面应用
- Responsibilities: 数据库初始化、子进程服务启动、窗口管理、更新检查、日志

**Next App Entry:**
- Location: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/workspace/page.tsx`
- Triggers: Electron 或浏览器访问本地 HTTP 服务
- Responsibilities: 渲染 UI、提交任务、轮询状态

**Worker API Entry:**
- Location: `src/app/api/tasks/worker/route.ts`
- Triggers: 页面提交任务后 fetch、服务启动恢复逻辑 POST 触发
- Responsibilities: 消费任务队列、更新进度、写入结果

## Error Handling

**Strategy:** 多数 API 与 worker 使用 `try/catch` 在边界捕获错误，失败时写入数据库状态或返回 JSON 错误；Electron 主进程注册 `uncaughtException` 和 `unhandledRejection` 记录日志。

**Patterns:**
- API route 返回 `NextResponse.json({ error })`
- worker 失败时回写 `FAILED` 或重置为 `PENDING`
- 主进程日志落盘并在启动失败时展示状态页

## Cross-Cutting Concerns

**Logging:**
- 主进程同步文件日志
- API / worker 广泛使用 `console.log` / `console.error`

**Validation:**
- 输入校验主要是手写逻辑，少量 zod/react-hook-form 存在于前端

**Authentication:**
- API routes 大量通过 `getServerSession(authOptions)` 做用户边界控制

---
*Architecture analysis: 2026-05-26*
*Update when major patterns change*
