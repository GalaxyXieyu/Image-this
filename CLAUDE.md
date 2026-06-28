# CLAUDE.md

## Project Overview

**Imagine This** is a desktop-first e-commerce AI visual production workbench. The repo combines Next.js 15 App Router, React 19, Prisma/SQLite, provider-backed image processing, and Electron packaging so authenticated users can upload product assets, generate scene/listing visuals, run background/outpaint/upscale/watermark/video workflows, monitor async tasks, and manage generated results locally.

Primary product surfaces are `/workspace/scene` for scene generation, `/combo` for multi-step workflow composition, `/tools` for utility tools, `/tasks` for task visibility, `/results` for generated assets, `/templates` for prompt/template management, `/settings` for provider/runtime configuration, and `/` for protected entry navigation.

## PM Contract

<!-- PM_CONTRACT:START -->
- PM config: `.planning/pm/pm.json`
- PM cache/context: `.planning/pm/`
- Task truth: PM task backend / local task backend
- Context truth: `.planning/pm/current-context.json`, `.planning/pm/bootstrap.json`, `.planning/pm/coder-context.json`
- Initialize or refresh PM only when tracked PM work is intended.
- Use PM for task creation/search, progress write-back, completion, and coder handoff when PM is enabled.
- Legacy root `pm.json` and `.pm/` are compatibility inputs only; prefer `.planning/pm/` for new PM state.
- Do not store secrets or tokens in PM config or docs.
<!-- PM_CONTRACT:END -->

## Harness Operating Model

<!-- HARNESS_MODEL:START -->
This project uses the Coding Harness.

### Layering

- Commands are user-facing entrypoints and safety gates.
- Skills contain reusable policy, methodology, rubrics, and conventions.
- Subagents perform concrete work such as research, planning, execution, verification, integration checking, debugging, and mapping.
- Do not duplicate long process rules inside commands when a skill owns that policy.

### User-Facing Commands

- `/plan` — turn a feature request into an executable plan.
- `/build` — implement planned work or a small bounded task.
- `/fix` — debug, fix, or simplify a narrow issue.
- `/verify` — unified check/review/verification entrypoint.
- `/push` — verify, commit, and push selected changes using shared git/PM policy.
- `/pinit` — write or refresh this Harness operating model; use `--pm`, `--map`, or `--full` for heavier initialization.

### Subagent Routing

- Planning: `phase-researcher`, `assumptions-analyzer`, `planner`, `plan-checker`.
- Build: `executor`.
- Fix: `debugger`, optionally `executor`.
- Verify: `verifier`, `integration-checker`.
- Project init/map: `codebase-mapper` only when mapping is explicitly requested.
- UI: `ui-researcher`, `ui-checker`, `ui-auditor`.
- Product/research/profile support: `project-researcher`, `research-synthesizer`, `roadmapper`, `user-profiler`.

### Verification Policy

Use `/verify` for all review/checking needs. Do not route to a separate `/code-review`. `verifier` checks goal achievement and implementation quality; `integration-checker` checks wiring, cross-module connections, and end-to-end user flows.

### Git Policy

Use `/push` for commit/push. `/push` must follow `gsd-git` policy, bind PM tasks when available, and use `/verify` semantics before committing.

### PM Rule

PM task/doc/context truth must not be bypassed when `.planning/pm/pm.json` exists.
<!-- HARNESS_MODEL:END -->

## Task Intake Procedure

<!-- TASK_INTAKE:START -->
收到任何任务后，按以下顺序决策，不要跳步直接写代码。

### Step 1 — 分类

| 任务类型 | 判断依据 |
|---------|---------|
| 新需求 / 功能 | 需要设计决策、新 API、新页面、新字段 |
| Bug 修复 | 实际行为与预期不符，有复现路径 |
| UI / 视觉调整 | 只涉及样式、布局、交互动效，不改业务逻辑 |
| 重构 / 清理 | 改结构但不改行为 |
| 调研 / 分析 | 输出是结论和建议，不是代码 |

分类不确定时，先问清楚再动手。

### Step 2 — 读取上下文（tracked work 必须）

```
.planning/pm/pm.json + current-context.json   # PM 任务绑定
.planning/STATE.md / PROJECT.md               # 项目当前阶段和目标
.planning/codebase-map/concerns.md            # 已知风险，评估影响范围
```

UI 任务额外读 `.planning/codebase/MINIAPP_UI_UX.md`（如有）。

### Step 3 — Subagent 路由

```
新需求  → /plan  (phase-researcher → assumptions-analyzer → planner → plan-checker)
          → /build (executor)
Bug     → /fix   (debugger → executor)
UI      → /plan  (ui-researcher → planner → plan-checker)
          → /build (executor) → /verify (ui-checker → ui-auditor)
重构    → /plan  (planner → plan-checker) → /build (executor)
调研    → project-researcher → research-synthesizer
```

两步以上的任务必须先跑 `/plan` 产出计划，再跑 `/build`，不要在同一步骤里边规划边实现。

### Step 4 — 渐进实现

- 超过两个实质步骤，保持可见计划并实时更新。
- 业务逻辑变更前先确认字段含义、用户场景和边界规则；发现需求冲突立即上报，不自行猜测。
- UI 变更前先查 token / primitive，不硬编码颜色、字重、尺寸。

### Step 5 — Verify & Push

```
/verify   # verifier 检查目标达成；integration-checker 检查跨模块接线
/push     # 通过验证后提交，绑定 PM 任务，写回进度
```
<!-- TASK_INTAKE:END -->

## Agent / Skill Roles

- `pm`: task intake, task/doc truth, context cache, write-back, completion.
- `product-canvas`: product, UX, acceptance clarification before implementation.
- `coder`: implementation after PM context is prepared.
- `project-review`: post-implementation review and project quality layer.
- `harness` / `gsd`: downstream planning, mapping, execution, and verification; must not bypass PM task/doc truth.

## Codebase Map

<!-- CODEMAP:START -->
- Runtime and commands
  - Node.js `>=20 <24` with npm and `package-lock.json`; Next.js dev and production both use port `34123`.
  - Development: `npm run dev` starts Next.js, `npm run electron:dev` starts web plus Electron, and `npm run clean` clears build caches.
  - Build/package: `npm run build` runs the production Next build, `npm run build:mac` packages macOS, and `npm run build:windows` packages Windows.
  - Database utilities: `npx prisma generate`, `npx prisma db push`, and `npx prisma studio`; do not run migrations or database commands during PM initialization.
  - Verification: `npm run lint`, `npm run test:uiux`, `npm run test:uiux:login-generate`, `npm run test:uiux:record:opencli`, and `npm run test:uiux:codegen`.
- Architecture and entrypoints
  - App Router pages live under `src/app/**/page.tsx`; API routes live under `src/app/api/**/route.ts`; middleware protects `/`, `/workspace`, `/combo`, `/tools`, `/templates`, `/tasks`, `/results`, and `/settings`.
  - Auth uses NextAuth credentials with Prisma in `src/lib/auth.ts`, hosted by `src/app/api/auth/[...nextauth]/route.ts`; user-scoped API routes must check session ownership.
  - AI provider abstraction uses `src/lib/image-processor/factory.ts`, `src/lib/image-processor/service.ts`, `src/lib/image-processor/types.ts`, and providers under `src/lib/image-processor/providers/` for Volcengine, GPT, Gemini, Qwen, and Jimeng.
  - Task creation and execution cross `src/app/api/tasks/route.ts`, `src/app/api/workflow/tasks/route.ts`, `src/app/api/tasks/status/route.ts`, `src/app/api/workflow/tasks/status/route.ts`, and `src/app/api/tasks/worker/route.ts`.
  - Workbench contracts and handlers live in `src/lib/workbench/api-contract.ts`, `src/lib/workbench/task-compat.ts`, `src/lib/workbench/worker-handlers.ts`, and `src/lib/workbench/handlers/*`.
  - Electron runtime uses `electron/main.js`, `electron/preload.js`, `electron/app-runtime.js`, and `electron/database-manager.js` for local server startup, IPC, packaged paths, SQLite preparation, updates, and worker scheduling.
- Data/state flow
  - Primary workflow: upload/register assets through `src/app/api/input-assets/route.ts`, create `TaskQueue` records, process tasks through worker/provider handlers, persist files and `ProcessedImage` rows, then poll status and render results.
  - Prisma SQLite models include `User`, `TaskQueue`, `ProcessedImage`, `PromptTemplate`, and `Project`; default development database is `prisma/app.db` with `DATABASE_URL` from `.env`.
  - `TaskQueue` states are `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and `CANCELLED`; new task types must keep frontend creation, worker dispatch, database comments/docs, polling, status labels, and result rendering synchronized.
  - Keep `TaskQueue.inputData` and `TaskQueue.outputData` lightweight; store asset references, file paths, result URLs, and result IDs rather than image/video/base64 payloads.
  - Provider credentials are user settings persisted through server-side APIs and loaded through `src/lib/user-config.ts`; never log secrets, API keys, tokens, full `.env` values, or full base64 payloads.
- Testing and verification
  - `npm run lint` is required because production builds ignore ESLint in `next.config.ts`.
  - `npm run build` validates the Next standalone output needed by Electron packages; platform packaging should be checked on target OS when Electron, Prisma, Sharp, storage, or file-serving behavior changes.
  - UI/UX replay writes artifacts under `out/ui-ux-plan/<run-id>/`; actual image generation may be `BLOCKED/ENV` when local provider credentials are missing, but navigation and task creation should still be recorded.
  - Use Playwright codegen/opencli recording for new or unstable flows, clean noisy recorded scripts, then promote stable steps into maintained UI/UX replay scripts.
  - Local UI testing account: `test@imaginethis.local` / `[REDACTED-见 .claude/credentials.local.md]`; register through `/auth/register` or the local registration API when needed.
  - Production owner account (for end-to-end checks on `https://image.bojie.store`): `xy523018705@gmail.com` / `[REDACTED-见 .claude/credentials.local.md]`. Sensitive — do not commit this credential to a tracked file other than as already noted here, and do not log it.
  - Working Gemini/toapis provider token for end-to-end image generation: key `[REDACTED-见 .claude/credentials.local.md]`, Base URL `https://toapis.com` (no `/v1`), model `gemini-3.1-flash-image-preview`. Set under `/settings`; account setting overrides server env.
  - `.pen` design files such as `docs/image-this.pen` are encrypted and must be accessed only through Pencil MCP tools, never direct file reads or greps.
- Quality conventions
  - Prefer Server Components unless browser state, upload, drag/drop, polling, canvas, navigation hooks, or direct interaction require Client Components.
  - Keep Prisma, filesystem, provider credentials, and external AI calls behind API routes or server-only libraries; React pages should use API clients/hooks rather than direct provider or database access.
  - Use `@/*` source imports, TypeScript strict patterns, shadcn/Radix primitives, Tailwind utilities, generic UI atoms in `src/components/ui/`, and product workbench components in `src/components/workbench/`.
  - Match surrounding style; no dedicated formatter is configured, and broad formatting-only diffs should be avoided.
  - Use `src/lib/workbench/api-contract.ts` and `src/lib/workbench/task-compat.ts` as task compatibility sources instead of scattering new task strings.
  - Keep generated maps in `.planning/codebase/` concise, evidence-based, and free of secrets.
- Known risks and uncertainties
  - `src/app/api/tasks/worker/route.ts` is the highest-risk file because it combines scheduling, claiming, dispatch, provider execution, persistence, retries, output sanitization, and status updates.
  - Worker lifecycle depends on API-triggered `/api/tasks/worker` plus Electron scheduler support; it is not a durable always-on queue daemon.
  - Task/provider naming can drift across workflow types, legacy task types, handler names, Prisma comments, task center labels, result grouping, and template categories.
  - `TaskQueue.inputData` and `TaskQueue.outputData` are SQLite string JSON fields; nested data URLs or large provider payloads can slow polling and desktop builds.
  - `src/app/api/settings/route.ts`, `src/app/api/files/[...path]/route.ts`, `src/app/api/input-assets/route.ts`, `electron/database-manager.js`, and `electron/main.js` are security/runtime-sensitive boundaries.
  - Desktop startup depends on local SQLite, Prisma assets, Next standalone output, environment loading, port selection, packaged resource paths, and worker triggering; verify Electron behavior when touching those areas.
<!-- CODEMAP:END -->

## Working Rules

- Default to Chinese communication unless code identifiers require English.
- For two or more steps, keep a plan and update it as work progresses.
- Before tracked implementation, read `pm.json` and `.pm/current-context.json`.
- When PM context exists, write progress and completion back through PM.
- Keep changes minimal, root-cause oriented, and consistent with existing code style.
- After finishing a feature, always run an end-to-end closed-loop verification through the real app (Chrome MCP / browser): log in, exercise the actual user flow, confirm the visible outcome (generated image, task completion, etc.), and screenshot — not just lint/tsc/unit checks. Use the production owner account above when validating live behavior.
