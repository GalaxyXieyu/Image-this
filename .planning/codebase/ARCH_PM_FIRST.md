# PM-First Architecture Map

**Analysis Date:** 2026-06-10

## Product Shape

Imagine This is a desktop-first Next.js App Router application packaged by Electron. The current product architecture centers on an e-commerce visual production workbench: authenticated users upload product/reference assets, create queued AI visual tasks, poll task status, and manage generated results.

**Primary surfaces:**
- `/workspace/scene` — main product scene generation workflow in `src/app/workspace/scene/page.tsx`.
- `/combo` — configurable multi-step workflow builder in `src/app/combo/page.tsx`.
- `/tools` — image utility toolbox in `src/app/tools/page.tsx`.
- `/tasks` — task center in `src/app/tasks/page.tsx`.
- `/results` — generated asset management in `src/app/results/page.tsx`.
- `/templates` — prompt/template library in `src/app/templates/page.tsx`.
- `/settings` — provider and runtime settings in `src/app/settings/page.tsx`.

## Major Entry Points

**Web/App Router:**
- `src/app/layout.tsx` is the global Next.js layout.
- `src/app/page.tsx` is the protected landing/entry route; unauthenticated users are redirected by `src/middleware.ts`.
- `src/app/auth/login/page.tsx` and `src/app/auth/register/page.tsx` provide auth screens.
- `src/app/workspace/scene/page.tsx` is a client component using uploads, task creation, and polling.

**API boundary:**
- `src/app/api/tasks/route.ts` creates and lists legacy task records and triggers `/api/tasks/worker` after creation.
- `src/app/api/workflow/tasks/route.ts` creates typed contract v2 workflow tasks and maps them to legacy-compatible `TaskQueue` rows.
- `src/app/api/tasks/worker/route.ts` claims pending tasks, dispatches handlers/provider calls, persists results, and updates progress.
- `src/app/api/tasks/status/route.ts` and `src/app/api/workflow/tasks/status/route.ts` are lightweight task polling surfaces.
- `src/app/api/input-assets/route.ts` registers uploaded/reference assets for workflows.
- `src/app/api/images/route.ts`, `src/app/api/images/[id]/route.ts`, and `src/app/api/files/[...path]/route.ts` expose stored image/file records to the UI.

**Desktop runtime:**
- `electron/main.js` is the Electron main process, window manager, local Next server launcher, scheduler, IPC host, and log manager.
- `electron/app-runtime.js` resolves packaged resource paths, standalone Next paths, Prisma paths, and user data paths.
- `electron/database-manager.js` prepares the local SQLite database, migrations, backups, and desktop secret storage.
- `electron/preload.js` exposes safe renderer IPC APIs under `window.electron` for file picking, updates, logs, and platform detection.

## Route Map

**Protected product routes:**
- `src/middleware.ts` protects `/`, `/workspace`, `/combo`, `/tools`, `/templates`, `/tasks`, `/results`, and `/settings` using NextAuth JWT tokens.
- Authenticated `/` requests remain allowed; unauthenticated `/` requests redirect to `/auth/login?callbackUrl=/workspace/scene`.

**Authentication routes:**
- `src/app/api/auth/[...nextauth]/route.ts` hosts NextAuth.
- `src/app/api/auth/register/route.ts` creates credential users.
- `src/lib/auth.ts` configures PrismaAdapter, credentials auth, optional Google/GitHub providers, JWT sessions, and `session.user.id` injection.

**Workflow/task routes:**
- `src/app/api/tasks/route.ts` accepts legacy task payloads with `type`, `inputData`, `priority`, `projectId`, `totalSteps`, `contractVersion`, `workflowType`, and `handlerName`.
- `src/app/api/workflow/tasks/route.ts` accepts typed workflow payloads with `workflowType`, `parameters`, and `inputAssets`, then stores `contractVersion: 2`.
- `src/app/api/tasks/worker/route.ts` is the execution boundary for background work.
- `src/app/api/tasks/recent/route.ts`, `src/app/api/tasks/retry/route.ts`, `src/app/api/tasks/recover/route.ts`, and `src/app/api/tasks/cron/route.ts` support task visibility, retries, recovery, and scheduled processing.

**Provider/direct processing routes:**
- `src/app/api/images-process/background-replace/route.ts`, `src/app/api/images-process/enhance/route.ts`, `src/app/api/images-process/outpaint/route.ts`, `src/app/api/images-process/watermark/route.ts`, and `src/app/api/images-process/workflow/one-click/route.ts` are direct image-processing endpoints.
- `src/app/api/volcengine/enhance/route.ts` and `src/app/api/volcengine/outpaint/route.ts` expose Volcengine-specific operations.
- `src/app/api/jimeng/generate/route.ts`, `src/app/api/jimeng-video/submit/route.ts`, and `src/app/api/jimeng-video/query/route.ts` expose Jimeng image/video operations.
- `src/app/api/quality-review/route.ts` performs AI quality review.
- `src/app/api/models/route.ts` lists available AI models.

**Settings/data routes:**
- `src/app/api/settings/route.ts` reads/writes user provider and runtime settings.
- `src/app/api/projects/route.ts` and `src/app/api/projects/[id]/route.ts` manage projects.
- `src/app/api/prompt-templates/route.ts` and `src/app/api/prompt-templates/[id]/route.ts` manage templates.
- `src/app/api/desktop-updates/windows/latest.yml/route.ts` and `src/app/api/desktop-updates/windows/[assetName]/route.ts` serve desktop update metadata/assets.

## Backend Boundaries

**API routes own privileged operations:**
- Keep Prisma access in API routes and server-side libraries such as `src/lib/prisma.ts`, `src/lib/user-config.ts`, and `src/lib/storage.ts`.
- Keep filesystem access in server/API/Electron layers such as `src/app/api/files/[...path]/route.ts`, `src/lib/storage.ts`, `src/lib/local-storage.ts`, and `electron/*`.
- Keep provider credentials server-side through `src/lib/user-config.ts`, `src/lib/image-processor/service.ts`, and settings APIs.

**Client pages own interaction state:**
- Use client components for upload, drag/drop, polling, selection, and browser-only workflows, as shown in `src/app/workspace/scene/page.tsx`.
- Use `src/lib/api-client.ts`, `src/lib/use-upload.ts`, and `src/hooks/workbench/useWorkflowTaskPolling.ts` from UI flows instead of direct Prisma/provider calls.

**Auth boundary:**
- Use `getServerSession(authOptions)` in API routes before accessing user data, matching `src/app/api/tasks/route.ts` and `src/app/api/workflow/tasks/route.ts`.
- Use `src/middleware.ts` for page-level route protection; API routes perform their own session checks.

## Provider Architecture

**Factory pattern:**
- `src/lib/image-processor/factory.ts` owns `ImageProcessorFactory`, which initializes and returns provider implementations by `ImageProvider`.
- Provider implementations live in `src/lib/image-processor/providers/volcengine.ts`, `src/lib/image-processor/providers/gpt.ts`, `src/lib/image-processor/providers/gemini.ts`, `src/lib/image-processor/providers/qwen.ts`, and `src/lib/image-processor/providers/jimeng.ts`.
- Shared contracts live in `src/lib/image-processor/types.ts`.

**Unified service layer:**
- `src/lib/image-processor/service.ts` initializes a selected provider from per-user config and exposes operation-level functions such as Gemini/GPT/Jimeng background replacement, Qwen outpaint, and Volcengine enhance/outpaint.
- `src/lib/user-config.ts` is the credential/runtime config source for provider initialization.
- `src/lib/ai-models.ts` maps model/provider metadata and fallback chains used by scene task adaptation.

**Provider placement rule:**
- Add provider-specific API calls inside `src/lib/image-processor/providers/` or provider utilities under `src/lib/image-processor/utils/`.
- Add cross-provider orchestration in `src/lib/image-processor/service.ts` or workbench handlers, not in React pages.

## Task Architecture

**Persistence model:**
- `prisma/schema.prisma` defines `TaskQueue` with `type`, `status`, `priority`, `progress`, retry fields, `inputData`, `outputData`, `contractVersion`, `workflowType`, and `handlerName`.
- `TaskQueue` statuses are string values: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and `CANCELLED`.
- `ProcessedImage`, `PromptTemplate`, `Project`, and `User` provide result, template, project, and credential/config storage.

**Creation paths:**
- Legacy task creation uses `src/app/api/tasks/route.ts` and stores loose JSON in `inputData`.
- Typed workflow task creation uses `src/app/api/workflow/tasks/route.ts` with `contractVersion: 2`, `workflowType`, and `handlerName`.
- Scene UI still builds legacy-compatible task requests through `src/lib/workbench/scene-task-adapter.ts`, including `workflowType: scene_generation` and model fallback metadata.

**Worker dispatch:**
- `src/app/api/tasks/worker/route.ts` claims pending tasks by priority/creation order, marks them `PROCESSING`, executes them, then writes lightweight `outputData` and completion state.
- `src/lib/workbench/worker-handlers.ts` registers typed handlers and resolves execution by `handlerName`, `workflowType`, then legacy `type`.
- Typed handlers are registered by import in `src/app/api/tasks/worker/route.ts` from `src/lib/workbench/handlers/background-replace.ts`, `outpaint.ts`, `upscale.ts`, `watermark.ts`, `one-click.ts`, and `video-generation.ts`.
- Contract v2 tasks use handler validation/execution/normalization; contract v1 tasks fall back to the worker’s legacy switch for `ONE_CLICK_WORKFLOW`, `BACKGROUND_REMOVAL`, `IMAGE_EXPANSION`, `IMAGE_UPSCALING`, `WATERMARK`, and `VIDEO_GENERATION`.

**Concurrency and safety:**
- `src/app/api/tasks/worker/route.ts` computes available slots from running `PROCESSING` tasks and user/runtime concurrency from `getUserConfig()` / `normalizeTaskConcurrency()`.
- Worker execution has a 10-minute timeout path.
- Worker output persistence uses a whitelist and rejects long/base64-like strings before writing `TaskQueue.outputData`.

## Main Data Flow

**Scene generation flow:**
1. User enters `/workspace/scene` in `src/app/workspace/scene/page.tsx`.
2. UI uploads/registers input and reference assets through `src/lib/use-upload.ts` and `src/app/api/input-assets/route.ts`.
3. UI builds one or more scene task requests with `src/lib/workbench/scene-task-adapter.ts`.
4. UI posts task requests to `src/app/api/tasks/route.ts` or typed workflow requests to `src/app/api/workflow/tasks/route.ts`.
5. API route creates `TaskQueue` rows in SQLite through Prisma and triggers `src/app/api/tasks/worker/route.ts`.
6. Worker resolves a typed handler or legacy branch, loads user provider config, calls `src/lib/image-processor/service.ts` or handler-specific processing code, and persists result files/records.
7. UI polls task status through `src/hooks/workbench/useWorkflowTaskPolling.ts` and task status APIs.
8. Completed results are surfaced from `TaskQueue.outputData`, `ProcessedImage`, file APIs, and `/results`.

**Settings/config flow:**
1. User updates `/settings` in `src/app/settings/page.tsx`.
2. Settings API persists provider keys/config to `User` fields in `prisma/schema.prisma` and desktop secret handling where applicable.
3. Provider initialization reads settings through `src/lib/user-config.ts` when a worker or direct API route processes a task.

## Desktop / Electron Integration

**Packaging and startup:**
- `package.json` sets `main` to `electron/main.js` and packages `.next/standalone`, `public`, `prisma`, Electron files, and `.env.production` through electron-builder.
- `electron/main.js` loads desktop environment values from `.env.production` locations without exposing them to the renderer.
- `electron/app-runtime.js` resolves `.next/standalone` and `prisma` paths differently for development and packaged apps.

**Local data:**
- `electron/database-manager.js` stores the runtime SQLite database under Electron `userData` paths resolved by `electron/app-runtime.js`.
- Desktop database preparation can restore from `prisma/app.db`, apply SQL migrations, back up databases, and patch user columns.
- Desktop secrets use `desktop-secrets.json`; Windows encrypts values through PowerShell `ConvertFrom-SecureString`, while non-Windows stores base64-encoded values.

**Renderer bridge:**
- `electron/preload.js` exposes `selectFile`, `selectDirectory`, `updates`, `logs`, `platform`, and `isElectron` APIs via `contextBridge`.
- UI code should access desktop-only capabilities through the preload API rather than Node globals.

**Worker scheduling:**
- `electron/main.js` maintains a worker scheduler timer and worker trigger state, complementing API-triggered worker calls after task creation.
- The worker is an API-route-driven processor, not a separate always-on queue daemon.

## Architecture Guidance for New Work

**Add new product UI:**
- Put route pages under `src/app/<route>/page.tsx`.
- Put reusable visual pieces under `src/components/workbench/` for current workbench UI or `src/components/ui/` for shadcn-style primitives.
- Use API routes for Prisma, provider calls, filesystem, credentials, and task creation.

**Add new task type:**
- Add or update task request adaptation in `src/lib/workbench/*-task-adapter.ts` or `src/lib/workbench/api-contract.ts`.
- Add a typed handler in `src/lib/workbench/handlers/` implementing the registry contract from `src/lib/workbench/worker-handlers.ts`.
- Import the handler in `src/app/api/tasks/worker/route.ts` so registration happens at worker load.
- Update `prisma/schema.prisma` comments/docs, task status/result rendering, and polling normalization where task type names appear.

**Add new provider/model:**
- Add provider implementation under `src/lib/image-processor/providers/` and shared types in `src/lib/image-processor/types.ts`.
- Register provider initialization in `src/lib/image-processor/factory.ts` and `src/lib/image-processor/service.ts`.
- Add model metadata/fallbacks in `src/lib/ai-models.ts` when UI selection needs it.
- Store user/provider settings through `src/app/api/settings/route.ts`, `src/lib/user-config.ts`, and `User` fields in `prisma/schema.prisma`.

**Modify desktop behavior:**
- Use `electron/main.js` for main-process lifecycle, IPC handlers, logging, and local Next server behavior.
- Use `electron/preload.js` for renderer-safe APIs.
- Use `electron/app-runtime.js` and `electron/database-manager.js` for packaged path and SQLite handling.

## High-Risk Boundaries

**Task worker:**
- `src/app/api/tasks/worker/route.ts` mixes scheduling, claiming, dispatch, provider execution, persistence, retry behavior, output sanitization, and status updates. Change it with focused patches and verify both typed and legacy paths.

**Task contract drift:**
- Frontend adapters such as `src/lib/workbench/scene-task-adapter.ts`, task APIs, `src/lib/workbench/worker-handlers.ts`, typed handlers, and result UI must stay synchronized on `type`, `workflowType`, `handlerName`, and output field names.

**Large payloads:**
- `TaskQueue.inputData` and `TaskQueue.outputData` are SQLite strings. Prefer asset references, file paths, and result record IDs over base64 or large provider payloads.

**Desktop path/database differences:**
- Packaged runtime paths differ from development paths through `electron/app-runtime.js`. Test filesystem, SQLite, and update behavior in Electron when changing storage, file serving, or build packaging.

---

*Architecture map: 2026-06-10*
