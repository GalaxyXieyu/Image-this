# Coding Conventions

**Analysis Date:** 2026-06-03

## Naming Patterns

**Routes:**
- Next.js App Router 固定使用 `page.tsx`、`layout.tsx`、`route.ts`。
- API route 按资源和动作分组，例如 `api/tasks/worker`、`api/images-process/enhance`。

**Files:**
- React 组件多为 `PascalCase.tsx`。
- hooks 多为 `useXxx.ts`。
- 工具和业务模块多为 `kebab-case.ts`，也存在历史混用。
- Electron 和构建脚本多为 `.js` / `.mjs` / `.cjs`。

**Types and Data:**
- TypeScript type/interface 使用 PascalCase。
- Prisma model 使用 PascalCase。
- SQLite 表通过 `@@map("snake_case")` 映射为 snake_case。
- 任务类型、模板分类、状态值以字符串常量为主，SQLite 内未使用 enum。

## Module Boundaries

**Preferred Placement:**
- 页面交互：`src/app/<route>/page.tsx`。
- 商品视觉工作台 UI：`src/components/workbench/`。
- 模板库 UI：`src/components/templates/`。
- 工作台相关 hooks：`src/hooks/workbench/`。
- API 边界：`src/app/api/<domain>/route.ts`。
- 业务共享逻辑：`src/lib/`。
- provider 能力：`src/lib/image-processor/`。

**Current Reality:**
- 部分页面文件偏长，页面内同时包含导航、mock 数据、状态和展示。
- `src/app/api/tasks/worker/route.ts` 是高复杂度文件，混合了调度、并发、执行、持久化和重试。
- 旧 `workspace` UI 目录、旧 `features/workspace` 抽象和旧工作区标签 store 已移除；新工作区相关代码应继续收敛到 `workbench`、`templates`、`hooks/workbench` 和具体页面。

## Style

**Formatting:**
- 2 空格缩进。
- 单引号和双引号混用：历史代码中两者都存在，新代码应优先贴近所在文件风格。
- 分号保留。
- JSX 中 Tailwind class 较多，布局主要直接使用 utility class。

**Imports:**
- 外部依赖在前。
- `@/` alias 用于 `src/` 内部模块。
- 相对导入主要用于同目录或紧邻文件。

**Exports:**
- 页面和组件常见 default export。
- 工具、service、类型更多使用 named export。

## Client/Server Boundaries

**Server-Oriented:**
- API routes、Prisma、文件系统、provider 调用必须保持服务端边界。
- Server Components 可用于纯展示页面，但当前大量页面是客户端交互页面。

**Client-Oriented:**
- 含 `useState`、浏览器跳转、拖拽、上传、轮询、toast 的页面和组件使用 `"use client"`。
- 根布局包裹 Auth provider、更新 provider 和全局任务按钮。

## Error Handling

**API Boundary:**
- 未登录返回 401。
- 参数错误返回 400。
- 业务/外部服务错误返回 JSON，并带 `details` 或可读错误信息。

**Task Boundary:**
- 任务失败要落库为 `FAILED` 或进入重试。
- `currentStep` 和 `errorMessage` 是用户可感知状态的重要字段。

**Desktop Boundary:**
- 启动、数据库、子进程和更新错误要写日志。
- 避免让桌面端启动失败只表现为空白页。

## Logging

**Current Pattern:**
- API/worker/provider 使用 `console.log`、`console.warn`、`console.error`。
- Electron 主进程写入本地日志。

**Preferred Pattern for New Work:**
- 日志内容以“阶段 + 任务/用户/配置是否存在 + 错误摘要”为主。
- 不直接输出完整 API Key、token、base64 大对象。
- 对轮询和高频路径保持克制，避免日志放大。

## Data Handling

**Task Input/Output:**
- `inputData` 和 `outputData` 当前是 JSON 字符串。
- 大图片、base64、视频地址、provider 原始响应应尽量避免长期塞入任务表。
- 前端展示 URL 要经过标准化，避免本地路径直接泄露到不兼容页面。

**User Config:**
- AI provider 密钥按用户存储。
- 读取配置时要明确区分“未配置”和“配置错误”。

## Comments

**Useful Comments:**
- 解释桌面端、Windows、打包、provider 限制、数据兼容原因。
- 解释为什么采用某个绕行方案。

**Avoid:**
- 重复代码表面行为的注释。
- 在复杂文件里继续堆积长段临时说明，优先拆边界。

## Refactoring Direction

- 长页面：把导航、步骤、配置区、结果区拆到 domain components。
- worker：拆成队列领取、任务执行、结果持久化、重试策略、任务类型分发。
- provider：保持 adapter 与服务编排分离。
- 状态接口：区分“列表页全量数据”和“轮询轻量状态”。

---
*Update when coding style, module ownership, or architectural conventions change.*