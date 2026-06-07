# Phase 3: Scene Image Guided Workflow - Context

**Gathered:** 2026-06-05
**Status:** Ready for plan execution
**Depends on:** Phase 1 (Workbench Foundation), Phase 2 (Template Library and Preset Model)
**Requirements:** WB-03, WB-05, WB-06, WB-07, WB-09

<domain>

## Phase Boundary

This phase turns `/workspace/scene` from a three-step UI prototype into the main executable scene image workflow. The flow must cover product information, input assets, preset initialization, task submission, lightweight polling, candidate result display, and save-to-results behavior.

This phase may use the existing `/api/tasks` adapter path, but it must not expand arbitrary page-local `inputData` JSON patterns. Full worker contract refactor remains Phase 5.

</domain>

<decisions>

## Current Product State

- Phase 1 delivered workbench shell, route skeletons, typed workflow domain types, API contract draft, and `useWorkflowTaskPolling`.
- Phase 2 delivered template library UI, static preset seed data, template navigation, and `PresetLoader` pattern.
- `/workspace/scene` currently has a visible three-step flow, but it still uses local page state, placeholder upload behavior, mock result cards, and direct `/api/tasks` submission with stringified `inputData`.
- `/templates` can navigate to `/workspace/scene?preset={id}`, but scene draft initialization is not complete.

## Architecture Direction

- Prefer the new workbench direction over the legacy workspace.
- Keep old workspace and legacy routes intact until Phase 6.
- Use input asset references instead of base64 payloads.
- Use `/api/tasks/status` as the preferred lightweight polling path.
- Use typed scene draft structures and compatibility adapters where possible.
- Do not deeply refactor `src/app/api/tasks/worker/route.ts` in this phase unless a narrow task-type compatibility fix is required.

## Phase 3 Boundary vs Phase 5

Phase 3 should deliver an executable scene workflow through existing task infrastructure plus adapter boundaries.

Phase 3 should not attempt the full typed workflow API and worker dispatch refactor. That belongs to Phase 5 after scene and toolbox flows prove their product shape.

</decisions>

<canonical_refs>

## Canonical References

### Product and GSD

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/01-product-visual-workbench-rebuild/01-CONTEXT.md`
- `.planning/phases/01-product-visual-workbench-rebuild/01-01-SUMMARY.md`
- `.planning/phases/02-template-library-preset-model/02-CONTEXT.md`
- `.planning/phases/02-template-library-preset-model/02-01-SUMMARY.md`
- `.planning/phases/02-template-library-preset-model/02-VERIFICATION.md`

### Active Code

- `src/app/workspace/scene/page.tsx`
- `src/app/templates/page.tsx`
- `src/components/workbench/PresetLoader.tsx`
- `src/lib/workbench/presets.ts`
- `src/types/workbench/index.ts`
- `src/lib/workbench/api-contract.ts`
- `src/hooks/workbench/useWorkflowTaskPolling.ts`
- `src/lib/use-upload.ts`
- `src/app/api/input-assets/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/status/route.ts`
- `src/app/api/tasks/worker/route.ts`
- `src/app/results/page.tsx`

### Historical Engineering Baseline

- `.planning/phases/01-desktop-runtime-performance`
- `.planning/phases/02-task-input-asset-references`
- `.planning/phases/03-app-log-observability`

</canonical_refs>

<specifics>

## Expected User Flow

```text
/templates
→ choose scene preset
→ /workspace/scene?preset={id}
→ preset initializes scene draft
→ user adds product information and reference assets
→ user chooses generation style/count/platforms
→ create scene generation task(s)
→ lightweight polling updates progress
→ candidate results appear
→ user previews/selects/saves result
→ saved assets are visible in /results and tasks are visible in /tasks
```

## Minimum Data Shape

Scene draft should cover:

- product name
- product type/category
- target audience
- usage scene
- selling points
- target platforms
- selected preset/template/style
- reference input assets
- generation count
- output intent/metadata

Task state should cover:

- task id
- workflow type
- status
- progress
- error message
- result asset references or result URLs

## Acceptance Criteria

1. `/workspace/scene` can read a scene preset and initialize useful draft state.
2. Product information, platform selections, scene usage, selling points, selected style, and reference assets form a stable scene draft.
3. Reference image upload uses input asset references and does not store base64 in polling or task status payloads.
4. Clicking generate creates real `TaskQueue` task(s) through a typed adapter boundary or equivalent centralized mapping.
5. Task progress is driven through `/api/tasks/status` or the reusable workbench polling hook.
6. Candidate results show real task/result data where available, including terminal failure states.
7. Result save/selection behavior connects to the existing result management surface.
8. Existing settings, tasks, results, provider config, Electron runtime, and historical task behavior remain reachable.

</specifics>

<risks>

## Risks and Constraints

- `src/app/api/tasks/worker/route.ts` is high-risk because it mixes scheduling, execution, provider dispatch, persistence, and retry behavior.
- Scene generation task type names can drift between UI creation, worker dispatch, task center rendering, and result persistence.
- Current scene page uses page-local state and mock cards; replacing it should avoid another large all-in-one client component.
- The worker lifecycle depends on `/api/tasks/worker` being triggered; do not assume a true always-on background worker.
- Large input payloads are risky for SQLite and Windows desktop builds.
- Phase 2 verification found preset navigation wired but draft initialization incomplete.

</risks>

<deferred>

## Deferred to Later Phases

- Full typed workflow API endpoint set (`/api/workflow/*`).
- Full worker handler decomposition and dispatch refactor.
- Preset DB migration and user-created presets.
- Unified smart toolbox implementation.
- Old workspace removal.
- Broad desktop packaging regression matrix.

</deferred>