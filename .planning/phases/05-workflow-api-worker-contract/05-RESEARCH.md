# Phase 5: Workflow API and Worker Contract Refactor — Research Report

Date: 2026-06-07
Branch: feature/ai-studio-2-commerce-workbench

---

## 1. Current State Analysis

### 1.1 Task Creation Flow: Where `inputData` Gets Constructed

There are **four distinct code paths** that construct `TaskQueue.inputData` as loose JSON strings:

#### Path A: Scene Workflow (`/workspace/scene`)
- **File**: `src/lib/workbench/scene-task-adapter.ts` — `buildSceneLegacyTaskRequest()`
- Builds a `BackgroundReplaceParams` object, wraps it via `adaptToLegacyTaskRequest()` from `api-contract.ts`, then **appends extra fields** directly into the JSON:
  - `workflowType: 'scene_generation'`
  - `sceneDraft: SceneWorkflowDraft` (full client draft state)
  - `selectedPresetId`, `styleTemplateIds`, `stylePreference`
  - `candidateCount`, `candidateIndex`, `batchMode`
  - `provider`, `modelName`, `fallbackModels`
- Posts to `/api/tasks` (single or array)

#### Path B: Tool Tasks (`/tools`)
- **File**: `src/lib/workbench/tool-task-adapter.ts` — `buildToolLegacyTaskRequest()`
- Wraps tool parameters via `adaptToLegacyTaskRequest()`, then appends:
  - `workflowType: <toolType>`
  - `selectedPresetId`, `batchMode`
  - `toolDraft: { toolType, inputAssets, parameters, batchMode }`
- Posts to `/api/tasks` as single task

#### Path C: Combo Workflow (`/combo`)
- **File**: `src/app/combo/page.tsx` — `handleExecute()`
- **Directly constructs** raw `inputData` with no adapter:
  ```ts
  inputData: JSON.stringify({
    resolution, watermarkEnabled, autoRetry, batchCount, stepName
  })
  ```
- Uses its own `typeToApiType` mapping (`scene` -> `SCENE_GENERATION`, etc.)
- These types (`SCENE_GENERATION`, `UPSCALE`, `OUTPAINT`) are **NOT recognized by the worker** — the worker only handles `BACKGROUND_REMOVAL`, `IMAGE_EXPANSION`, `IMAGE_UPSCALING`, `WATERMARK`, `ONE_CLICK_WORKFLOW`, `VIDEO_GENERATION`
- **This is a latent bug**: combo-created tasks would throw `"不支持的任务类型"` if ever picked up by the worker.

#### Path D: Legacy/External (if any)
- The `/api/tasks` POST endpoint accepts any `type` string and any `inputData` string. There is no validation of either field against a schema.

#### What `/api/tasks/route.ts` does on creation
- `sanitizeTaskInputDataAsync()`: scans for `data:` URLs in `imageUrl` and asset `clientUrl`, uploads them to local storage, replaces with file URLs
- `normalizeTaskInputData()`: minimal passthrough that just validates JSON parseability
- Stores the raw JSON string in `TaskQueue.inputData`
- Triggers worker via `fetch('/api/tasks/worker', { batch: true })`

### 1.2 Worker Dispatch: Current Task Processors

**File**: `src/app/api/tasks/worker/route.ts` (~1219 lines)

The worker is a single `TaskProcessor` class with a **large switch statement** dispatching on `task.type`:

| Task Type | Handler Method | Lines | Key Characteristics |
|-----------|---------------|-------|---------------------|
| `ONE_CLICK_WORKFLOW` | `processOneClickWorkflow` | 516-596 | Calls `executeOneClickWorkflow()` service; creates `ProcessedImage` record inside service |
| `BACKGROUND_REMOVAL` | `processBackgroundRemoval` | 598-805 | Multi-provider (GPT/Gemini/Jimeng) with fallback chain; **each branch duplicates** Prisma `processedImage.create()` + `uploadBase64Image()` |
| `IMAGE_EXPANSION` | `processImageExpansion` | 807-879 | Volcengine only; creates `ProcessedImage` inline |
| `IMAGE_UPSCALING` | `processImageUpscaling` | 881-946 | Volcengine only; creates `ProcessedImage` inline |
| `WATERMARK` | `processWatermark` | 948-1048 | Local watermark lib; creates `ProcessedImage` inline with two-phase (PROCESSING -> COMPLETED) update |
| `VIDEO_GENERATION` | `processVideoGeneration` | 1050-1103 | Jimeng video API; polls for result; **does NOT create a `ProcessedImage`** — returns video metadata only |

**Critical observations about the worker:**

1. **Each processor duplicates the same pattern**: parse `inputData`, read asset as base64, call provider service, `uploadBase64Image()`, `prisma.processedImage.create()`, update task progress.
2. **Provider dispatch is hardcoded per task type**: Background removal has inline `if (provider === 'gpt') ... else if (provider === 'gemini') ... else if (provider === 'jimeng')` — this logic should live in the image processor service, not the worker.
3. **User config injection mutates task.inputData**: `processSingleTask()` injects `volcengineConfig` and `imagehostingConfig` into the parsed inputData and re-serializes it back into `task.inputData`. This is a side effect on the task object.
4. **No separation between scheduling and execution**: The same class claims tasks from the DB, executes them, handles retries, updates progress, and persists results.
5. **Result shape varies by task type**: Each processor returns a different ad-hoc object shape.

### 1.3 Result Persistence: What Goes into `outputData`

**File**: `src/app/api/tasks/worker/route.ts` — `buildPersistedResult()` (lines 82-125)

The worker uses a **whitelist approach** to sanitize results before storing in `outputData`:

```ts
const allowedFields = new Set([
  'processedImageId', 'processedImageUrl', 'usedModel', 'prompt',
  'videoUrl', 'jimengTaskId', 'frames', 'aspectRatio',
  'expandRatio', 'upscaleFactor', 'watermarkText', 'watermarkOpacity',
  'watermarkPosition', 'watermarkType', 'outputResolution', 'processSteps',
]);
```

**Per-task-type result shapes:**

| Task Type | outputData Fields |
|-----------|-------------------|
| `ONE_CLICK_WORKFLOW` | `processedImageId`, `processedImageUrl`, `processSteps`, `settings` (but `settings` is NOT in the whitelist, so it gets dropped with a warning) |
| `BACKGROUND_REMOVAL` | `processedImageId`, `processedImageUrl`, `prompt`, `usedModel` |
| `IMAGE_EXPANSION` | `processedImageId`, `processedImageUrl`, `expandRatio` |
| `IMAGE_UPSCALING` | `processedImageId`, `processedImageUrl`, `upscaleFactor` |
| `WATERMARK` | `processedImageId`, `processedImageUrl`, `watermarkText`, `watermarkOpacity`, `watermarkPosition`, `watermarkType`, `outputResolution` |
| `VIDEO_GENERATION` | `videoUrl`, `jimengTaskId`, `prompt`, `frames`, `aspectRatio` |

**Problems:**
- `settings` from `ONE_CLICK_WORKFLOW` is dropped by the whitelist (line 110 warns but continues)
- The whitelist is manually maintained; adding a new result field requires updating both the processor AND the whitelist
- `outputData` is always a JSON string; no schema validation on write or read
- The `processedImageId` field is also stored in a dedicated `TaskQueue.processedImageId` column, creating redundancy

### 1.4 How Results Are Read Back

Three endpoints read `outputData` and extract result URLs:

1. **`/api/tasks/route.ts` (GET list)**: `extractResultImageUrl()`, `extractVideoUrl()`, `extractUsedModel()` — each does its own `JSON.parse()` with try/catch
2. **`/api/tasks/[id]/route.ts` (GET detail)**: Uses `adaptLegacyTaskToSummary()` from `api-contract.ts`
3. **`/api/tasks/status/route.ts` (GET status polling)**: Uses `adaptLegacyTaskToSummary()`
4. **`/api/tasks/recent/route.ts` (GET recent)**: Inline parse with IIFE closures

All of these do defensive `JSON.parse()` with try/catch, which is a smell that the data is untyped.

---

## 2. Existing Typed Contract Coverage

### 2.1 What Already Exists

**File**: `src/types/workbench/index.ts`

Already well-typed:
- `WorkflowType` union: `'scene_generation' | 'background_replace' | 'watermark' | 'upscale' | 'outpaint' | 'one_click' | 'video_generation'`
- `ToolType` union (same values)
- `ToolParameters` discriminated union: `BackgroundReplaceParams | WatermarkParams | UpscaleParams | OutpaintParams | OneClickParams | VideoParams`
- `InputAssetRef` — structured asset reference with `assetId`, `filePath`, `clientUrl`, `originalFilename`, `mimeType`, `sizeBytes`
- `GeneratedAsset` — output asset structure
- `WorkflowTaskSummary` — lightweight client-facing task representation
- `SceneWorkflowDraft`, `ToolRunDraft` — client draft states
- `WORKFLOW_TO_LEGACY_TYPE` mapping and `legacyTypeToWorkflowType()` reverse mapping
- `buildLegacyInputData()` — converts typed params to legacy JSON string

**File**: `src/lib/workbench/api-contract.ts`

Already defined:
- `CreateWorkflowTaskRequest` / `CreateWorkflowTaskResponse`
- `CreateBatchWorkflowTasksRequest` / `CreateBatchWorkflowTasksResponse`
- `ListWorkflowTasksRequest` / `ListWorkflowTasksResponse`
- `BatchTaskStatusRequest` / `BatchTaskStatusResponse`
- `WorkflowTaskSummary` (mirrors the types file)
- `adaptToLegacyTaskRequest()` — converts typed request to `{ type, inputData, priority, projectId }`
- `adaptLegacyTaskToSummary()` — converts `TaskQueue` record to `WorkflowTaskSummary`

**File**: `src/lib/workbench/task-compat.ts`

Already defined:
- `normalizeWorkflowType()` — handles legacy type aliases
- `normalizeTaskStatus()` — handles legacy status aliases
- `inferWorkflowTypeFromTask()` — infers workflow type from task type + inputData
- `WORKFLOW_TYPE_LABELS` — human-readable labels

**File**: `src/lib/workbench/tool-task-adapter.ts`

Already defined:
- `ToolTaskDraftInput` — structured input for tool task creation
- `buildToolLegacyTaskRequest()` — converts typed draft to legacy request
- `buildDefaultToolParameters()` — per-tool default parameters
- `mergeAssetParameters()` — merges asset refs into parameters

**File**: `src/lib/workbench/scene-task-adapter.ts`

Already defined:
- `SceneTaskDraftInput` — structured input for scene task creation
- `buildSceneLegacyTaskRequest()` / `buildSceneLegacyTaskRequests()` — converts typed draft to legacy request(s)
- `buildScenePrompt()` — prompt construction from product info

### 2.2 What Typed Contracts Are Actually Used

The typed contracts exist but **all current task creation still goes through the legacy path**:

```
Frontend (typed draft)
  -> scene-task-adapter.ts / tool-task-adapter.ts (builds typed request)
  -> api-contract.ts adaptToLegacyTaskRequest() (converts to legacy { type, inputData })
  -> POST /api/tasks (stores raw JSON string)
  -> Worker reads raw JSON, parses with JSON.parse(), processes
```

The typed contracts are currently a **thin wrapper around the legacy system**, not a replacement.

---

## 3. Gap Analysis

### 3.1 Missing Typed Contracts

| Gap | Description | Impact |
|-----|-------------|--------|
| **No typed task input schema** | `inputData` is always `string` (JSON). No runtime validation that the JSON matches `ToolParameters`. | Invalid tasks can be created; worker fails at runtime with cryptic errors |
| **No typed task result schema** | `outputData` is always `string` (JSON). No contract for what processors must return. | Result extraction is defensive (`try/catch` + fallback chains); frontend cannot trust shape |
| **No typed worker dispatch** | Worker uses string switch on `task.type`. No registry or handler map. | Adding a new task type requires editing the worker switch in two places (`processNextTask` and `executeTaskWithType`) |
| **No unified result persistence contract** | Each processor creates `ProcessedImage` differently. Some inline, some via service. Video doesn't create one at all. | Inconsistent data model; `/results` page has to handle missing/null fields |
| **No `workflowVersion` or `contractVersion` field** | Old tasks and new tasks are indistinguishable in the database. | Migration is risky; cannot apply different parsing logic based on task vintage |
| **No `/api/workflow` routes exist** | The `api-contract.ts` defines request/response shapes for `POST /api/workflow/tasks`, `GET /api/workflow/tasks`, etc., but no actual API routes implement them. | The typed contract is "dead code" — unused by any client or server path |
| **Combo page bypasses all adapters** | `src/app/combo/page.tsx` directly constructs `inputData` with no type safety. | Creates tasks that the worker cannot process |

### 3.2 Missing Prisma Schema Support

The current `TaskQueue` model (prisma/schema.prisma, lines 160-199):

```prisma
model TaskQueue {
  id               String        @id @default(cuid())
  type             String        // 任务类型 — free string, no enum
  status           String        @default("PENDING")
  // ...
  inputData        String        // JSON字符串 — no validation
  outputData       String?       // JSON字符串 — no validation
  // ...
}
```

Missing fields that would help:
- `workflowType String?` — the normalized workflow type (for querying/filtering without parsing `inputData`)
- `contractVersion Int @default(1)` — version of the input/output contract (enables migration logic)
- `inputSchema String?` — identifier of the input schema (e.g., `"background_replace/v1"`)
- `outputSchema String?` — identifier of the output schema
- `handlerName String?` — name of the worker handler that should process this task (decouples task type from handler)

These additions would be **backward-compatible** (all nullable or with defaults) and would not break existing data.

---

## 4. Refactor Strategy: Minimal Viable Approach

### 4.1 Guiding Principles

1. **Don't break existing tasks** — old `inputData`/`outputData` strings must remain readable
2. **Don't change the worker's external behavior** — it still processes tasks, creates `ProcessedImage` records, updates progress
3. **Introduce contracts at the boundaries** — task creation and result reading, not internal worker mechanics
4. **Make the combo page safe** — it currently creates unprocessable tasks
5. **Keep the refactor incremental** — one task type at a time if needed

### 4.2 Recommended Minimal Refactor (MVP)

#### Step 1: Add Contract Version to TaskQueue (Prisma)

Add these fields to `TaskQueue`:

```prisma
model TaskQueue {
  // ... existing fields ...
  contractVersion  Int           @default(1)  // 1 = legacy loose JSON, 2 = typed workflow contract
  workflowType     String?                    // normalized workflow type for querying
  handlerName      String?                    // worker handler registry key
  // ...
}
```

Run `npx prisma db push`. Existing rows get `contractVersion = 1` automatically.

#### Step 2: Create a Typed Worker Handler Registry

Create `src/lib/workbench/worker-handlers.ts`:

```ts
export interface WorkflowHandler<TInput extends ToolParameters, TResult extends WorkflowResult> {
  name: string;
  workflowType: WorkflowType;
  validateInput(raw: unknown): TInput;
  execute(task: QueueTaskForProcessing, input: TInput): Promise<TResult>;
  buildOutputData(result: TResult): Record<string, unknown>;
}

export const WORKFLOW_HANDLERS: Map<string, WorkflowHandler<any, any>> = new Map([
  ['background_replace', backgroundReplaceHandler],
  ['watermark', watermarkHandler],
  ['upscale', upscaleHandler],
  ['outpaint', outpaintHandler],
  ['one_click', oneClickHandler],
  ['video_generation', videoGenerationHandler],
]);
```

Each handler encapsulates:
- Input validation (using a schema like Zod or manual checks)
- The actual processing logic (extracted from the current worker switch cases)
- Result shape normalization

#### Step 3: Extract Processor Logic into Handlers (One at a Time)

For each task type, extract the body of the current `processXxx()` method into a handler:

- Move `processBackgroundRemoval` -> `backgroundReplaceHandler.execute()`
- Move `processImageExpansion` -> `outpaintHandler.execute()`
- Move `processImageUpscaling` -> `upscaleHandler.execute()`
- Move `processWatermark` -> `watermarkHandler.execute()`
- Move `processVideoGeneration` -> `videoGenerationHandler.execute()`
- Move `processOneClickWorkflow` -> `oneClickHandler.execute()`

The worker's switch statement becomes:

```ts
const handler = WORKFLOW_HANDLERS.get(task.handlerName || task.type);
if (!handler) throw new Error(`No handler for: ${task.type}`);
const validatedInput = handler.validateInput(parsedInput);
const result = await handler.execute(task, validatedInput);
const outputData = handler.buildOutputData(result);
```

#### Step 4: Create `/api/workflow/tasks` Route (New Contract Endpoint)

Create `src/app/api/workflow/tasks/route.ts`:

```ts
// POST — accepts CreateWorkflowTaskRequest (typed)
// Validates input against ToolParameters schema
// Stores task with contractVersion = 2, workflowType, handlerName
// Triggers worker

// GET — accepts ListWorkflowTasksRequest
// Returns ListWorkflowTasksResponse with WorkflowTaskSummary[]
// Uses adaptLegacyTaskToSummary for contractVersion 1, direct mapping for version 2
```

#### Step 5: Update Frontend Adapters to Use New Endpoint

Modify `tool-task-adapter.ts` and `scene-task-adapter.ts`:

```ts
// Instead of:
const legacy = adaptToLegacyTaskRequest(workflowRequest);
return apiPost("/api/tasks", legacy);

// Use:
return apiPost("/api/workflow/tasks", workflowRequest);
```

The adapters still build the typed `CreateWorkflowTaskRequest`, but now submit to the typed endpoint.

#### Step 6: Fix the Combo Page

Update `src/app/combo/page.tsx` to:
1. Use the same `buildToolLegacyTaskRequest()` or new workflow endpoint
2. Stop constructing raw `inputData` directly
3. Use the correct task types that the worker recognizes

#### Step 7: Add Result Contract Types

Create `src/types/workbench/results.ts`:

```ts
export interface WorkflowResult {
  processedImageId?: string;
  processedImageUrl?: string;
  usedModel?: string;
  prompt?: string;
}

export interface VideoWorkflowResult extends WorkflowResult {
  videoUrl: string;
  jimengTaskId: string;
  frames: number;
  aspectRatio: string;
}

export interface WatermarkWorkflowResult extends WorkflowResult {
  watermarkText: string;
  watermarkOpacity: number;
  watermarkPosition: string;
  watermarkType: string;
  outputResolution: string;
}

// etc.
```

Update `buildPersistedResult()` to use these types instead of an ad-hoc whitelist.

### 4.3 What This Achieves (Success Criteria Check)

| Success Criteria | How MVP Achieves It |
|-----------------|---------------------|
| 1. New UI doesn't directly construct arbitrary `inputData` strings | Frontend uses `/api/workflow/tasks` with typed `CreateWorkflowTaskRequest`; server validates |
| 2. Worker dispatches by typed workflow/tool handler | `WORKFLOW_HANDLERS` registry; each handler validates input before processing |
| 3. Result payloads are consistent | `WorkflowResult` base interface + per-type extensions; `buildOutputData` normalizes shape |
| 4. Old tasks remain readable | `contractVersion = 1` tasks use existing `adaptLegacyTaskToSummary`; no data migration needed |

---

## 5. Risk Assessment

### 5.1 High-Risk Areas

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Worker is a single 1200-line file with no tests** | High | Extract handlers one at a time; verify each extracted handler against existing behavior before moving to the next. Do not refactor the entire worker in one commit. |
| **Task type names drift between frontend and worker** | High | The `handlerName` field decouples task type from handler. The registry is the single source of truth. The combo page bug proves this drift already exists. |
| **ProcessedImage creation is duplicated across 6 processors** | Medium | Extract a `persistProcessedImage()` helper. Each handler calls it with typed parameters. This also fixes the inconsistency where video doesn't create a `ProcessedImage`. |
| **User config injection mutates task.inputData** | Medium | Pass user config as a separate parameter to handlers, not by mutating the task object. The handler receives `(task, input, userConfig)`. |
| **Base64/imageData accidentally stored in outputData** | Medium | The existing whitelist in `buildPersistedResult` is good. Preserve it as a final safety layer even after adding typed results. |
| **SQLite schema changes on deployed desktop builds** | Medium | Add fields with `@default()` values. Test `prisma db push` on a copy of the production database. Desktop builds bundle the SQLite file; users may have existing data. |
| **Polling endpoints depend on outputData shape** | Medium | The `/api/tasks/status` and `/api/tasks/recent` endpoints use `adaptLegacyTaskToSummary`. Keep this adapter working for both v1 and v2 tasks. |
| **Timeout and retry logic is tightly coupled to processSingleTask** | Medium | The 10-minute timeout and retry mechanism should be extracted as a wrapper, not duplicated per handler. |

### 5.2 What NOT to Do (Anti-patterns to Avoid)

1. **Don't rewrite the worker from scratch** — extract incrementally
2. **Don't change the TaskQueue primary key or core fields** — only add nullable columns
3. **Don't remove the existing `/api/tasks` endpoint** — keep it working for external callers and old clients
4. **Don't store base64 in the database even with typed contracts** — the whitelist guard stays
5. **Don't introduce a heavy schema validation library** — Zod is fine if already a dependency, but manual validation with TypeScript narrowing is sufficient for the MVP

---

## 6. Recommended Phase 5 Plan Outline

### Wave 1: Foundation (Schema + Registry)
1. Add `contractVersion`, `workflowType`, `handlerName` to Prisma schema
2. Run `prisma db push` and verify on test database
3. Create `src/lib/workbench/worker-handlers.ts` with registry interface
4. Create `src/types/workbench/results.ts` with result contracts

### Wave 2: First Handler Extraction (Background Replace)
1. Extract `processBackgroundRemoval` into `backgroundReplaceHandler`
2. Wire handler into worker switch (fallback to old code if handler fails)
3. Add input validation to handler
4. Test end-to-end with `/tools` page (background replace tool)

### Wave 3: Remaining Handler Extractions
1. Extract `watermarkHandler`
2. Extract `upscaleHandler`
3. Extract `outpaintHandler`
4. Extract `videoGenerationHandler`
5. Extract `oneClickHandler`

### Wave 4: New API Endpoint
1. Create `POST /api/workflow/tasks` route
2. Create `GET /api/workflow/tasks` route
3. Create `GET /api/workflow/tasks/status` route
4. Update `adaptLegacyTaskToSummary` to handle v1 and v2 tasks

### Wave 5: Frontend Migration
1. Update `tool-task-adapter.ts` to use `/api/workflow/tasks`
2. Update `scene-task-adapter.ts` to use `/api/workflow/tasks`
3. Fix `combo/page.tsx` to use adapters instead of raw JSON
4. Remove dead code from `api-contract.ts` if any

### Wave 6: Cleanup and Verification
1. Remove old worker switch statement once all handlers are verified
2. Add integration tests for each handler
3. Verify old tasks still display correctly in `/tasks` and `/results`
4. Document the handler registry for future task types

---

## Appendix A: File Inventory

| File | Role in Current System | Role in Refactored System |
|------|----------------------|--------------------------|
| `src/app/api/tasks/worker/route.ts` | Monolithic worker with switch dispatch | Thin orchestrator using handler registry |
| `src/app/api/tasks/route.ts` | Legacy task creation + listing | Keep for backward compat; new code in `/api/workflow/tasks` |
| `src/app/api/tasks/[id]/route.ts` | Task detail + update + delete | Keep; use `adaptLegacyTaskToSummary` for v1/v2 compat |
| `src/app/api/tasks/status/route.ts` | Batch status polling | Keep; already uses `adaptLegacyTaskToSummary` |
| `src/app/api/tasks/recent/route.ts` | Recent tasks | Keep; inline parsing stays for v1 compat |
| `src/lib/workbench/api-contract.ts` | Typed request/response shapes + adapters | Keep shapes; `adaptToLegacyTaskRequest` becomes deprecated |
| `src/lib/workbench/task-compat.ts` | Type normalization + inference | Keep; essential for v1/v2 compat |
| `src/lib/workbench/tool-task-adapter.ts` | Tool task -> legacy request | Tool task -> typed workflow request |
| `src/lib/workbench/scene-task-adapter.ts` | Scene task -> legacy request | Scene task -> typed workflow request |
| `src/types/workbench/index.ts` | Domain types (assets, drafts, params) | Add result types |
| `prisma/schema.prisma` | TaskQueue with loose JSON fields | TaskQueue with contract version + workflow type fields |
| `src/app/combo/page.tsx` | Raw JSON task creation (buggy) | Use typed adapters |
| `src/app/tools/page.tsx` | Uses `buildToolLegacyTaskRequest` | Use new typed endpoint |
| `src/app/workspace/scene/page.tsx` | Uses `buildSceneLegacyTaskRequests` | Use new typed endpoint |

## Appendix B: Combo Page Bug Detail

The combo page at `src/app/combo/page.tsx` (lines 189-211) uses task types that the worker does not recognize:

```ts
const typeToApiType: Record<StepType, string> = {
  scene: "SCENE_GENERATION",      // Worker knows: BACKGROUND_REMOVAL
  background: "BACKGROUND_REMOVAL", // Worker knows: BACKGROUND_REMOVAL
  upscale: "UPSCALE",             // Worker knows: IMAGE_UPSCALING
  watermark: "WATERMARK",         // Worker knows: WATERMARK
  outpaint: "OUTPAINT",           // Worker knows: IMAGE_EXPANSION
};
```

`SCENE_GENERATION`, `UPSCALE`, and `OUTPAINT` are not handled by the worker switch. If a combo task were ever claimed by the worker, it would throw `"不支持的任务类型"`. This page appears to be a mock/prototype (it uses hardcoded template data), but the task creation path is real and would create broken tasks.
