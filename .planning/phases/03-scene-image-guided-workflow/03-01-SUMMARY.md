---
phase: "03"
plan: "03-01"
subsystem: "scene-image-guided-workflow"
tags: ["scene", "workflow", "task-queue", "results", "workbench"]
dependency_graph:
  requires: ["01-01", "02-01"]
  provides: ["04-01", "05-01", "06-01"]
  affects:
    - "src/app/workspace/scene"
    - "src/app/api/tasks"
    - "src/app/api/models"
    - "src/lib/workbench"
    - "src/hooks/workbench"
tech_stack:
  added: []
  patterns:
    - "typed-adapter-boundary"
    - "legacy-task-compatibility"
    - "lightweight-status-polling"
    - "processed-image-result-save"
key_files:
  created:
    - src/lib/ai-models.ts
    - src/lib/workbench/scene-task-adapter.ts
    - src/lib/workbench/task-compat.ts
  modified:
    - src/app/workspace/scene/page.tsx
    - src/app/api/models/route.ts
    - src/app/api/tasks/route.ts
    - src/app/api/tasks/status/route.ts
    - src/app/api/tasks/recent/route.ts
    - src/app/api/tasks/worker/route.ts
    - src/app/tasks/page.tsx
    - src/components/navigation/FloatingTaskButton.tsx
    - src/hooks/workbench/useWorkflowTaskPolling.ts
    - src/lib/workbench/api-contract.ts
    - src/lib/use-task-polling.ts
    - src/lib/use-upload.ts
    - src/types/workbench/index.ts
decisions:
  - "Phase 3 delivers executable scene workflow through existing task infrastructure plus adapter boundaries."
  - "Full workflow API and worker dispatch refactor remains Phase 5."
  - "Scene generation uses business workflowType scene_generation while worker ingress remains legacy BACKGROUND_REMOVAL for compatibility."
  - "Task polling uses /api/tasks/status and compact task summaries instead of full input/output payloads."
metrics:
  completed_date: "2026-06-06"
  waves_total: 5
  waves_completed: 5
---

# Phase 3 Plan 03-01: Scene Image Guided Workflow Summary

## One-liner

`/workspace/scene` is now an executable three-step scene workflow: preset initializes draft, product/reference assets create real tasks, lightweight polling drives candidate status, and completed candidates can be saved into result management.

## What Was Built

### Checkpoint 0 — Model-call and model-list compatibility

- Synced selected model discovery behavior into `src/app/api/models/route.ts`.
- Added centralized model registry in `src/lib/ai-models.ts` for scene-capable models and fallback chains.
- Preserved current branch work while avoiding broad `main` merge.
- Kept provider dispatch compatibility with current task infrastructure.

### Wave 1 — Scene draft and preset initialization

- `/workspace/scene?preset={id}` now reads static preset data and initializes visible draft fields.
- Direct `/workspace/scene` entry still starts from empty/default draft.
- Scene draft covers product name, type, platform, scene/style, selected templates, model, size, candidate count, and batch mode.
- Active preset name and description are visible in the workflow.

### Wave 2 — Input assets and task submission adapter

- Product image and reference image upload through the existing input asset flow.
- Scene task creation uses compact asset references and client URLs, not base64 payloads.
- `src/lib/workbench/scene-task-adapter.ts` centralizes scene draft to legacy task request mapping.
- One task is created per candidate.
- Scene generation is represented as `workflowType: "scene_generation"` while worker execution uses the existing `BACKGROUND_REMOVAL` compatibility branch.

### Wave 3 — Lightweight polling and candidate state

- Candidate cards now bind to real task IDs.
- `useWorkflowTaskPolling` polls `/api/tasks/status` with compact summaries.
- Candidate state reflects pending, processing, completed, failed, and cancelled states.
- Candidate cards show progress, current step, task ID, provider error message, result URL, and used model where available.
- `src/lib/workbench/task-compat.ts` centralizes legacy/new status and workflow naming boundaries.

### Wave 4 — Result save and closeout

- Completed candidates with result URLs can be saved into `ProcessedImage` through `/api/images`.
- Saved scene results are classified as `BACKGROUND_REMOVAL`, which the current `/results` page maps to the “场景图” category.
- Saved result metadata preserves scene workflow context: task ID, candidate ID, preset, product fields, templates, model, output size, and saved timestamp.
- Candidate cards show saved state and link to `/results` after save.
- Build verification passes.

## Acceptance Coverage

| Criteria | Status | Evidence |
|---|---|---|
| Scene preset initializes useful draft state | Done | `/workspace/scene?preset=...` maps preset params into workflow data |
| Product and style fields form a stable draft | Done | scene page state includes product, platform, scene, selling points, templates, model, size, count |
| Reference uploads avoid base64 task payloads | Done | input assets use `InputAssetRef` with `clientUrl` and file metadata |
| Generate creates real tasks | Done | scene page posts legacy-compatible task requests to `/api/tasks` |
| Polling uses lightweight task status | Done | candidate state comes from `useWorkflowTaskPolling` + `/api/tasks/status` |
| Candidate cards show terminal states and results | Done | completed/failed/cancelled states and errors are rendered |
| Completed results can be saved | Done | candidate save creates `ProcessedImage` record through `/api/images` |
| Build passes | Done | `npm run build` completed successfully on 2026-06-06 |

## Known Deferred Work

- Full typed `/api/workflow/*` endpoint set remains Phase 5.
- Full worker handler decomposition remains Phase 5.
- Unified smart toolbox remains Phase 4.
- Preset persistence in DB remains later scope.
- Broad Electron/Windows packaging regression remains Phase 6.
- Browser/manual smoke with real provider credentials is still recommended before external release, because provider success depends on local user configuration.

## Verification Evidence

- `npx eslint --config config/eslint.config.mjs src/app/workspace/scene/page.tsx` passed with 0 errors.
- The only focused lint warning is the existing Next.js `<img>` performance warning for candidate preview.
- `npm run build` passed and generated all 39 static pages.
- Build copied production runtime assets and post-build dependencies successfully.