# Architecture

**Analysis Date:** 2026-06-03

## Pattern Overview

**Overall:** 这是一个桌面优先的 Next.js 全栈单体应用。Electron 负责启动本地运行环境，Next.js 同时承载页面和 API，Prisma + SQLite 保存用户、任务、图片、模板和项目数据，AI provider 通过统一处理层接入。

**Key Characteristics:**
- 一个仓库同时包含 Web、API、桌面壳、数据库 schema、打包脚本和部署配置。
- 业务主线是“输入素材 → 创建任务 → 后台处理 → 保存结果 → 页面轮询展示”。
- 图片、视频等大文件主要走本地文件系统或图床；任务状态走 SQLite。
- 桌面端依赖 Next standalone 产物完整性，打包链路对 Prisma、sharp、环境变量较敏感。

## Layers

**Desktop Runtime Layer**
- Purpose：启动桌面应用、准备数据库、拉起 Next 服务、处理窗口和自动更新。
- Contains：`electron/main.js`、`electron/database-manager.js`、`electron/preload.js`、`electron/update-manager.js`。
- Depends on：本地文件系统、打包后的 `.next/standalone`、SQLite、Electron API。

**Next App Layer**
- Purpose：渲染首页、场景工作区、组合工作流、工具箱、任务中心、结果管理、模板库、设置页。
- Contains：`src/app/**/page.tsx`、`src/app/layout.tsx`、`src/app/globals.css`。
- Depends on：React、Tailwind、shadcn/ui、NextAuth provider、客户端请求层。

**HTTP/API Layer**
- Purpose：暴露认证、任务、图片处理、模板、设置、项目、文件访问、桌面更新等接口。
- Contains：`src/app/api/**/route.ts`。
- Depends on：NextAuth、Prisma、storage、image processor、外部 AI provider。

**Business Logic Layer**
- Purpose：任务编排、图像处理、provider 分发、存储转换、配置读取。
- Contains：`src/lib/**`、`src/lib/image-processor/**`、`src/features/**`、部分 API service。
- Depends on：用户配置、AI provider、本地文件、Prisma。

**Persistence Layer**
- Purpose：保存用户配置、任务队列、处理结果、项目和提示词模板。
- Contains：`prisma/schema.prisma`、`src/lib/prisma.ts`、`src/lib/storage.ts`、`src/lib/local-storage.ts`。
- Depends on：SQLite、本地文件系统、Prisma Client。

## Data Flow

**Desktop Startup Flow:**
1. 用户启动 Electron。
2. 主进程准备日志、环境变量和数据库。
3. 主进程启动 Next standalone 子进程。
4. 通过健康检查确认服务可用。
5. Electron 窗口加载本地页面。

**Task Processing Flow:**
1. 页面提交处理请求。
2. `/api/tasks` 写入 `task_queue`。
3. 页面或恢复逻辑触发 `/api/tasks/worker`。
4. worker 领取 `PENDING` 任务并标记为 `PROCESSING`。
5. worker 按任务类型调用背景替换、扩图、高清化、水印、视频等处理链路。
6. 结果写入本地文件/图床和数据库。
7. 页面通过任务接口或状态接口轮询进度。

**AI Provider Flow:**
1. API/worker 根据任务选择 provider。
2. 从用户配置读取对应密钥和模型信息。
3. 初始化 provider adapter。
4. 调用外部服务。
5. 统一返回图片、视频或错误信息。

## Key Abstractions

**TaskQueue**
- Role：业务任务队列。
- Scope：任务类型、状态、进度、重试、输入输出、用户和项目归属。
- Runtime：当前是数据库队列 + API 触发式 worker。

**ProcessedImage**
- Role：处理结果记录。
- Scope：原图、处理图、缩略图、类型、状态、质量审核、元数据。

**Image Processor Provider**
- Role：统一屏蔽 Gemini、GPT、Qwen、Jimeng、Volcengine 的差异。
- Scope：背景替换、扩图、高清化、生成等能力。

**Storage Layer**
- Role：把业务结果落到本地文件或图床，并转换成前端可访问 URL。

**Desktop Bootstrap**
- Role：把桌面壳、数据库、Next 服务和更新逻辑串成一个可启动应用。

## Entry Points

**Desktop:**
- `electron/main.js`：桌面主入口。

**Web/App:**
- `src/app/layout.tsx`：全局布局、Auth provider、桌面更新 provider、全局任务按钮、toast。
- `src/app/page.tsx`：首页。
- `src/app/workspace/scene/page.tsx`：场景图工作区。
- `src/app/combo/page.tsx`：组合工作流页面。
- `src/app/tools/page.tsx`：智能工具箱入口。

**API:**
- `src/app/api/tasks/route.ts`：任务创建与列表。
- `src/app/api/tasks/worker/route.ts`：任务消费。
- `src/app/api/images-process/**/route.ts`：核心图像处理接口。
- `src/app/api/settings/route.ts`：用户配置。
- `src/app/api/files/[...path]/route.ts`：本地文件访问。

## State Boundaries

**Server State:**
- SQLite：用户、任务、图片、项目、模板。

**Client State:**
- React state：页面局部交互。
- Zustand：工作区标签和相关 UI 状态。

**File State:**
- 本地上传、处理结果、桌面日志、打包资源。

## Error Handling

**Current Pattern:**
- API 边界返回 JSON 错误。
- worker 失败时更新任务状态、错误信息和重试计数。
- Electron 主进程捕获启动和子进程异常并写日志。

**Known Limitation:**
- 任务失败通知没有完全统一。
- worker 生命周期仍依赖 HTTP 请求触发，不是真正常驻后台处理器。

---
*Update when runtime shape, task lifecycle, or major product surfaces change.*