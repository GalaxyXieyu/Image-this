# Phase 4: Unified Smart Toolbox - Context

**Gathered:** 2026-06-06
**Status:** Ready for plan execution
**Depends on:** Phase 1 (Workbench Foundation), Phase 2 (Template Library and Preset Model), Phase 3 (Scene Workflow task/status/result pattern)
**Requirements:** WB-04, WB-05, WB-06, WB-07, WB-09

<domain>

## Phase Boundary

This phase turns `/tools` from a direct synchronous image utility page into a unified smart toolbox workbench. Tool runs should reuse the same product workbench structure and the Phase 3 task/status/result pattern: input asset references, typed adapter boundaries, real task creation, lightweight polling, visible terminal states, and result management.

This phase should deliver usable background replace, watermark, upscale, and outpaint surfaces through the existing task infrastructure. Full `/api/workflow/*` endpoint implementation and worker decomposition remain Phase 5.

</domain>

<decisions>

## Current Product State

- `/tools` currently uses a local tab UI and direct image processing endpoints through `useImageProcess`.
- Tool results are automatically saved through `/api/images`, but task queue visibility is weak or absent for this page.
- Tool presets already exist in `src/lib/workbench/presets.ts` for background, watermark, upscale, and image-process categories.
- Phase 3 established a better pattern for executable workflows: typed adapter boundary → `/api/tasks` → `/api/tasks/status` → candidate/result UI → `/results`.

## Architecture Direction

- Prefer one unified toolbox workbench over many tool-specific route pages.
- Keep `/tools` as the primary toolbox route.
- Use input asset references instead of base64 or large JSON task payloads.
- Use `src/lib/workbench/task-compat.ts` for naming/status consistency.
- Use `/api/tasks/status` as the preferred polling path.
- Keep worker changes narrow; do not refactor the worker in this phase.
- Keep direct image-process APIs intact for compatibility, but route the new toolbox UX through the task queue.

## Phase 4 Boundary vs Phase 5

Phase 4 should prove the product and UX shape for tools using compatibility adapters.

Phase 5 should then formalize typed workflow APIs and worker handler decomposition after both scene workflow and tool workflow are validated.

</decisions>

<canonical_refs>

## Canonical References

### Product and GSD

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/03-scene-image-guided-workflow/03-01-SUMMARY.md`
- `.planning/phases/03-scene-image-guided-workflow/03-VERIFICATION.md`

### Active Code

- `src/app/tools/page.tsx`
- `src/lib/workbench/api-contract.ts`
- `src/lib/workbench/task-compat.ts`
- `src/hooks/workbench/useWorkflowTaskPolling.ts`
- `src/lib/use-upload.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/status/route.ts`
- `src/app/api/tasks/worker/route.ts`
- `src/app/results/page.tsx`
- `src/lib/workbench/presets.ts`
- `src/types/workbench/index.ts`

### Historical Engineering Baseline

- `.planning/codebase/CONCERNS.md`
- `.planning/phases/02-task-input-asset-references`
- `.planning/phases/03-app-log-observability`

</canonical_refs>

<specifics>

## Expected User Flow

```text
/templates or /tools
→ choose tool or preset
→ upload input image
→ tune tool parameters
→ create a real task
→ lightweight polling updates status
→ result preview appears when available
→ saved result is visible in /results
→ task is visible in /tasks
```

## Minimum Data Shape

Tool draft should cover:

- selected tool type
- input asset references
- optional reference/logo asset references
- tool parameters
- selected preset/template
- batch mode
- task id and result summary after submission

Supported first-wave tools:

- `background_replace`
- `watermark`
- `upscale`
- `outpaint`

## Acceptance Criteria

1. `/tools` uses a unified three-panel workbench structure.
2. Tool selection, upload, parameters, task state, and result preview share one data model.
3. Tool presets can initialize the selected tool and parameter defaults where practical.
4. At least background replace, watermark, upscale, and outpaint can create real tasks through `/api/tasks` compatibility path.
5. Tool task state is driven through `/api/tasks/status`.
6. Completed result can be inspected and linked to `/results`.
7. Existing direct image-process APIs, task center, settings, and results remain reachable.
8. `npm run build` passes before phase closeout.

</specifics>

<risks>

## Risks and Constraints

- Current `/tools` uses synchronous processing endpoints, while the target is task queue visibility. The transition must not break existing backend APIs.
- Worker type names must stay aligned with `WORKFLOW_TO_LEGACY_TYPE` and `task-compat`.
- Watermark may require logo input, but first-wave can support text watermark as default.
- Background replace may need a prompt and optional reference asset; first-wave can use prompt-only defaults if reference is not required by the selected worker path.
- Worker lifecycle still depends on `/api/tasks/worker` being triggered; do not assume an always-on worker.
- Large payloads must stay out of polling and task JSON.

</risks>

<deferred>

## Deferred to Later Phases

- Full `/api/workflow/tool` endpoint set.
- Full worker handler decomposition.
- Advanced canvas editing and watermark drag handles.
- True batch group persistence.
- Provider health check UX.
- Old frontend removal.
- Broad Electron/Windows packaging regression.

</deferred>