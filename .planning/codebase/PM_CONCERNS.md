# PM-First Codebase Concerns

**Analysis Date:** 2026-06-10
**Focus:** Product-management initialization risks for task execution, provider reliability, data safety, auth/security, and desktop runtime.

## Executive Risk Summary

**Highest priority risks:**
- Task execution depends on API-triggered worker entry points in `src/app/api/tasks/worker/route.ts`, with additional Electron scheduler support in `electron/main.js`; browser/web and desktop lifecycles are not identical.
- Task/provider naming is partially normalized through `src/lib/workbench/task-compat.ts`, `src/lib/workbench/api-contract.ts`, and `src/lib/workbench/worker-handlers.ts`, but legacy strings still exist in UI, Prisma comments, worker switches, and result grouping.
- Large payload risk is actively mitigated but not eliminated: `TaskQueue.inputData` and `TaskQueue.outputData` remain `String` JSON fields in `prisma/schema.prisma`.
- Provider credentials are stored and returned through settings APIs in `src/app/api/settings/route.ts`; Electron migrates some secrets to `desktop-secrets.json` in `electron/database-manager.js`, with weaker non-Windows protection.
- Electron production startup depends on local SQLite, Prisma assets, Next standalone output, environment loading, port selection, and worker triggering across `electron/main.js`, `electron/database-manager.js`, and `electron/app-runtime.js`.

## Known Risks

**Task worker lifecycle:**
- Issue: Queue processing is still centered on POST requests to `src/app/api/tasks/worker/route.ts`; task creation triggers worker fetches from `src/app/api/tasks/route.ts` and `src/app/api/workflow/tasks/route.ts`.
- Evidence: `src/app/api/tasks/route.ts` calls `triggerWorkerAfterTaskCreation`; `src/app/api/workflow/tasks/route.ts` calls `triggerWorker`; `src/app/api/tasks/worker/route.ts` owns task claiming, processing, retry, and completion.
- Desktop mitigation: `electron/main.js` defines a worker scheduler interval and in-flight guard, so packaged desktop has extra recovery behavior.
- Impact: Web/dev mode can still miss or interrupt background processing when trigger requests fail, server restarts, or no scheduler is active.
- Fix approach: Treat `src/app/api/tasks/worker/route.ts` as the current execution boundary; move toward a durable process-level worker and keep API routes limited to enqueue/status/control.

**Worker complexity:**
- Issue: `src/app/api/tasks/worker/route.ts` combines scheduling, locking, dispatch, provider config injection, image persistence, retries, progress updates, and response formatting.
- Evidence: The same file contains `claimPendingTasks`, `processNextTask`, `processBatch`, legacy switch dispatch, typed handler dispatch, provider-specific image operations, and retry updates.
- Impact: PM phases that touch one workflow can regress unrelated task types such as `BACKGROUND_REMOVAL`, `IMAGE_EXPANSION`, `IMAGE_UPSCALING`, `WATERMARK`, or `VIDEO_GENERATION`.
- Fix approach: Split by concern: queue claim/retry service, typed handler execution, result persistence, and provider adapters.

**Task/provider drift:**
- Issue: Multiple naming layers coexist: workflow types (`scene_generation`, `background_replace`, `upscale`, `outpaint`), legacy task types (`BACKGROUND_REMOVAL`, `IMAGE_UPSCALING`, `IMAGE_EXPANSION`), process types (`IMAGE_OUTPAINTING`), and prompt categories (`OUTPAINT`, `UPSCALE`).
- Evidence: `prisma/schema.prisma` documents legacy constants; `src/lib/workbench/task-compat.ts` normalizes aliases; `src/lib/workbench/api-contract.ts` maps workflow requests to legacy tasks; `src/app/results/page.tsx` groups several legacy/result names.
- Impact: New PM requirements can appear implemented in UI while worker dispatch, results, templates, or task center labels disagree.
- Fix approach: Use `src/lib/workbench/task-compat.ts` and `src/lib/workbench/api-contract.ts` as the source of truth for new work; update UI labels, worker handlers, result grouping, and Prisma comments together.

**Typed contract migration risk:**
- Issue: Contract v2 handler registry is active, while contract v1 fallback still exists.
- Evidence: `src/lib/workbench/worker-handlers.ts` resolves by `handlerName`, `workflowType`, alias, then legacy type; `src/app/api/tasks/worker/route.ts` uses typed handlers only when `(contractVersion ?? 1) >= 2`.
- Impact: A new task path that omits `contractVersion`, `workflowType`, or `handlerName` can silently fall back to legacy behavior or fail with unsupported task type.
- Fix approach: Submit new PM-facing flows through `src/app/api/workflow/tasks/route.ts` or adapters that set `contractVersion: 2`, `workflowType`, and `handlerName`.

## High-Risk Files

**Execution core:**
- `src/app/api/tasks/worker/route.ts`: Highest-risk file; any edit can affect all async workflows, retry behavior, persisted outputs, and provider dispatch.
- `src/app/api/tasks/route.ts`: Legacy task CRUD and list endpoint; still selects `inputData`/`outputData` for list normalization and triggers worker fetches.
- `src/app/api/workflow/tasks/route.ts`: Typed workflow task API; key migration path for safer PM-first task creation.
- `src/lib/workbench/worker-handlers.ts`: Handler registry; missing registration causes task creation rejection or legacy fallback.

**Task compatibility and UI mapping:**
- `src/lib/workbench/task-compat.ts`: Normalizes task aliases and statuses; update this before adding labels in scattered UI files.
- `src/types/workbench/index.ts`: Contains workflow-to-legacy mappings used by adapters.
- `src/app/results/page.tsx`: Groups process/task type strings for result views; prone to drift from worker output.
- `src/components/navigation/FloatingTaskButton.tsx`: Displays active task labels/icons from both workflow and legacy task names.

**Data and security:**
- `prisma/schema.prisma`: Stores credentials, tasks, and result metadata; SQLite strings hold JSON payloads.
- `src/app/api/settings/route.ts`: Saves and returns provider credentials to authenticated users.
- `src/app/api/files/[...path]/route.ts`: Serves local files; path-root and auth behavior matter for desktop safety.
- `src/app/api/input-assets/route.ts`: Accepts uploaded files and persists them through `src/lib/storage`.

**Desktop runtime:**
- `electron/main.js`: Starts Next standalone, sets hardcoded desktop `NEXTAUTH_SECRET`, schedules worker triggers, handles logs, navigation, and recovery.
- `electron/database-manager.js`: Restores/migrates SQLite, patches schema, migrates secrets, and applies PRAGMAs.
- `electron/app-runtime.js`: Resolves packaged resource paths for `.next/standalone` and `prisma`.

## Data Payload Concerns

**Task JSON size:**
- Issue: `TaskQueue.inputData` and `TaskQueue.outputData` are unbounded JSON strings in `prisma/schema.prisma`.
- Evidence: `src/app/api/tasks/route.ts` sanitizes top-level data URLs via `sanitizeTaskInputDataAsync`; `src/app/api/tasks/worker/route.ts` filters persisted result fields and drops long strings over 10,000 characters.
- Impact: Nested payloads, provider metadata, prompts, URLs, and accidental base64 can still enlarge SQLite rows and slow polling.
- Fix approach: Store assets through `src/app/api/input-assets/route.ts`; keep task JSON to asset refs, parameters, status, and lightweight result URLs only.

**Polling payload:**
- Issue: Lightweight status endpoint exists, but broader task list paths still parse task JSON to derive previews.
- Evidence: `src/app/api/tasks/status/route.ts` selects status fields plus `inputData` and `outputData` for requested IDs; `src/app/api/tasks/route.ts` list path selects `inputData` and `outputData` to build summaries.
- Impact: High-frequency polling and many completed tasks can pressure SQLite and frontend rendering.
- Fix approach: Prefer `src/app/api/tasks/status/route.ts` for active task polling; avoid adding large fields to task status/list responses.

**File path trust boundary:**
- Issue: Worker reads `inputAsset.filePath` directly in `src/app/api/tasks/worker/route.ts`.
- Evidence: `readAssetAsDataUrl` uses `fs.readFile(asset.filePath)` without rechecking ownership/root in the worker.
- Impact: If task input is forged through an API path, local file access risk depends on upstream validation.
- Fix approach: Ensure task creation only accepts asset refs produced by `src/app/api/input-assets/route.ts` and validate asset paths against the user storage root before worker reads.

## Auth and Security

**Settings expose credentials to client:**
- Risk: Authenticated GET `src/app/api/settings/route.ts` returns API keys/secrets into the browser settings form.
- Evidence: Response includes `volcengine.secretKey`, `gpt.apiKey`, `gemini.apiKey`, `jimeng.arkApiKey`, `jimeng.secretKey`, and `imagehosting.superbedToken` when configured.
- Current mitigation: Route requires a NextAuth session; logs avoid printing values in this route.
- Recommendation: Prefer write-only/masked credential UX with explicit reveal or re-entry; keep secrets out of routine GET responses.

**Desktop secret storage is platform-dependent:**
- Risk: `electron/database-manager.js` encrypts with PowerShell DPAPI-like `ConvertFrom-SecureString` on Windows, but uses base64 on non-Windows.
- Evidence: `encryptSecret` returns `Buffer.from(secret).toString('base64')` when `process.platform !== 'win32'`.
- Current mitigation: Legacy secrets are migrated out of SQLite for supported columns and stored in app user config.
- Recommendation: Treat non-Windows desktop secret store as obfuscation, not encryption; use OS keychain/keytar or Electron safeStorage where possible.

**Local file serving:**
- Risk: `src/app/api/files/[...path]/route.ts` serves files after path traversal checks, but unauthenticated desktop fallback uses default base directories when no session exists.
- Evidence: The route checks `..`, `~`, and resolved path prefix; in packaged mode without session it falls back to `~/ImagineThis`.
- Current mitigation: Path normalization blocks obvious traversal; MIME set is limited for common image types.
- Recommendation: Require session for user storage paths or restrict unauthenticated access to explicitly public assets only.

**Hardcoded desktop auth secret:**
- Risk: `electron/main.js` sets `NEXTAUTH_SECRET` to a fixed desktop string in `getServerEnv`.
- Evidence: `NEXTAUTH_SECRET: 'electron-app-secret-key-min-32-characters-long'` is passed to the forked Next server.
- Impact: Desktop sessions are predictable across installs if other controls fail.
- Recommendation: Generate a per-install secret in `electron/main.js` or config storage and reuse it across launches.

## Electron and Runtime Uncertainties

**Startup critical path:**
- Issue: Desktop startup chains database readiness, migration, PRAGMAs, Next standalone fork, health polling, window loading, update manager, and worker scheduler.
- Evidence: `electron/main.js` calls `ensureDesktopDatabaseReady`, starts `.next/standalone/server.js`, waits for `/api/health`, then loads the app URL; `electron/database-manager.js` restores/migrates SQLite before server start.
- Impact: Missing packaged assets, bad migration SQL, locked SQLite, or port issues can surface as white screen or long startup.
- Fix approach: Preserve startup status pages and logs; add smoke tests that verify `electron/app-runtime.js` resource paths, `prisma/app.db`, migrations, and `/api/health` after packaging.

**Port and network surface:**
- Issue: `electron/main.js` starts the Next server on `0.0.0.0` with fallback ports.
- Evidence: `isPortAvailable` and fallback server listen on `0.0.0.0`; `getServerEnv` sets `HOSTNAME: '0.0.0.0'` and `NEXTAUTH_URL` to localhost.
- Impact: Local network exposure may be broader than a desktop-only app requires.
- Fix approach: Prefer binding desktop server to `127.0.0.1` unless LAN access is intentional.

**Database migration safety:**
- Issue: Desktop migrations are applied manually with `node:sqlite`, plus ad hoc user-column patches.
- Evidence: `electron/database-manager.js` maintains `desktop_migrations`, applies migration SQL, patches missing `users` columns, and backs up before migration.
- Current mitigation: Pre-migration and corrupted backups are created; WAL and `synchronous=NORMAL` are applied.
- Impact: Schema drift between Prisma migrations, template DB, and patch list can break upgrades.
- Fix approach: Keep Prisma schema, migrations, desktop patches, and template database synchronized for each release.

## Test Coverage Gaps

**Critical gaps:**
- Worker state transitions across `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, and retry exhaustion are not visibly protected near `src/app/api/tasks/worker/route.ts`.
- Task naming compatibility across `src/lib/workbench/task-compat.ts`, `src/lib/workbench/api-contract.ts`, `src/app/results/page.tsx`, and `src/components/navigation/FloatingTaskButton.tsx` needs regression coverage.
- Payload sanitization for nested data URLs and forged asset file paths needs coverage around `src/app/api/tasks/route.ts`, `src/app/api/workflow/tasks/route.ts`, and `src/app/api/input-assets/route.ts`.
- Desktop packaged startup needs smoke coverage for `electron/main.js`, `electron/database-manager.js`, `.next/standalone`, Prisma binaries, and local SQLite migrations.
- Security coverage should include `src/app/api/files/[...path]/route.ts`, `src/app/api/settings/route.ts`, and unauthenticated/forged task access.

## PM Planning Guidance

**When planning task/provider work:**
- Start from `src/app/api/workflow/tasks/route.ts` for new PM-facing flows.
- Register or reuse a handler in `src/lib/workbench/worker-handlers.ts` and corresponding `src/lib/workbench/handlers/*` file.
- Update `src/lib/workbench/task-compat.ts`, `src/types/workbench/index.ts`, `src/app/results/page.tsx`, and task-center UI labels in the same phase.
- Keep `TaskQueue.inputData` and `TaskQueue.outputData` lightweight; use uploaded asset refs and `ProcessedImage` records for files/results.

**When planning security work:**
- Treat `src/app/api/settings/route.ts`, `electron/database-manager.js`, and `src/app/api/files/[...path]/route.ts` as the first audit targets.
- Avoid logging provider credentials, full prompts with secrets, local absolute file paths, or base64 image/video payloads.
- Validate user ownership/root for any asset path before worker filesystem reads.

**When planning Electron work:**
- Check `electron/main.js`, `electron/database-manager.js`, `electron/app-runtime.js`, `prisma/schema.prisma`, and packaging scripts together.
- Verify packaged startup, database migration, task execution, file serving, and settings persistence on the target OS before marking the phase complete.

---

*Concerns audit: 2026-06-10*