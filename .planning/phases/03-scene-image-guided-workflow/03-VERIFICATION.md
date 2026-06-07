---
phase: 03-scene-image-guided-workflow
verified: 2026-06-06T00:00:00Z
status: verified_with_manual_smoke_pending
score: 8/8 implementation truths verified
re_verification: false
gaps:
  - truth: "真实 provider 端到端生成成功"
    status: manual_pending
    reason: "Build and integration code path are verified, but provider success depends on local user credentials and runtime model availability."
  - truth: "Electron/Windows packaged runtime regression"
    status: deferred
    reason: "Phase 3 validates web build and task/result contracts; full desktop packaging matrix remains Phase 6."
human_verification:
  - test: "Open /templates, select a scene preset, and click 使用此模板"
    expected: "Browser lands on /workspace/scene?preset={id}; draft fields are initialized from the preset."
  - test: "Upload product and reference images, then generate candidates"
    expected: "One real task per candidate is created; /tasks shows them; candidate cards show task IDs and status changes."
  - test: "Wait for a completed candidate and click 保存结果"
    expected: "Candidate shows saved state; /results includes the saved scene image under 场景图."
  - test: "Open /settings after the workflow"
    expected: "Provider/runtime settings remain reachable."
---

# Phase 03: Scene Image Guided Workflow Verification Report

**Phase Goal:** 把 `/workspace/scene` 从三步 UI 原型推进为可执行的场景图生成闭环。
**Verified:** 2026-06-06
**Status:** verified_with_manual_smoke_pending

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `/workspace/scene` can initialize draft from a scene preset | VERIFIED | Scene page reads `?preset=` and maps preset params to workflow data. |
| 2 | Direct scene entry remains usable | VERIFIED | Missing/unknown preset falls back to empty/default workflow data. |
| 3 | Product information and generation parameters form a stable draft | VERIFIED | Draft includes product fields, platform, scene/style, selling points, templates, AI model, output size, candidate count, and batch flag. |
| 4 | Input/reference images use asset references instead of base64 task payloads | VERIFIED | Upload path stores `InputAssetRef`; scene adapter sends compact asset references and client URLs. |
| 5 | Generate creates real task queue entries | VERIFIED | Scene page posts one legacy-compatible `/api/tasks` request per candidate. |
| 6 | Candidate state uses lightweight polling | VERIFIED | `useWorkflowTaskPolling` reads compact summaries from `/api/tasks/status`. |
| 7 | Candidate cards render real lifecycle states | VERIFIED | Cards display pending/processing/completed/failed/cancelled, progress, current step, task ID, error, result image URL, and used model. |
| 8 | Completed candidate can be saved to result management | VERIFIED | Save action creates a `ProcessedImage` through `/api/images`; `/results` maps `BACKGROUND_REMOVAL` to the 场景图 category. |

**Score:** 8/8 implementation truths verified.

## Required Artifact Verification

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/app/workspace/scene/page.tsx` | Executable scene workflow | VERIFIED | Preset init, upload, task create, polling, candidate result, save action. |
| `src/lib/workbench/scene-task-adapter.ts` | Centralized scene-to-task adapter | VERIFIED | Builds compact legacy task requests with scene metadata. |
| `src/lib/workbench/task-compat.ts` | Legacy/new naming boundary | VERIFIED | Normalizes workflow type and task status for UI/status surfaces. |
| `src/hooks/workbench/useWorkflowTaskPolling.ts` | Lightweight polling hook | VERIFIED | Polls task status endpoint and feeds candidate state. |
| `src/app/api/tasks/status/route.ts` | Compact status endpoint | VERIFIED | Returns task summaries without large input/output blobs. |
| `src/app/api/tasks/route.ts` | Task creation compatibility path | VERIFIED | Accepts scene adapter output. |
| `src/app/api/tasks/worker/route.ts` | Narrow worker compatibility | VERIFIED | Current phase preserves legacy worker ingress; broad refactor deferred. |
| `src/app/api/images/route.ts` | Result save target | VERIFIED | Existing POST creates `ProcessedImage` used by `/results`. |

## Data Flow Trace

```text
/templates
→ /workspace/scene?preset={id}
→ preset params initialize scene draft
→ product/reference images become InputAssetRef
→ scene-task-adapter builds compact legacy task requests
→ /api/tasks creates TaskQueue rows
→ /api/tasks/status returns compact task summaries
→ candidate cards render state and result URL
→ 保存结果 posts to /api/images
→ ProcessedImage appears in /results as 场景图
```

## Automated Verification

| Check | Result | Notes |
|---|---|---|
| Focused scene page lint | PASS with warning | `npx eslint --config config/eslint.config.mjs src/app/workspace/scene/page.tsx` returned 0 errors and 1 existing `<img>` warning. |
| Editor diagnostics | PASS | No diagnostics reported for `src/app/workspace/scene/page.tsx`. |
| Production build | PASS | `npm run build` completed successfully and generated all 39 static pages. |
| Post-build runtime copy | PASS | Build copied Next static assets, public files, Prisma, sharp, Prisma client, `.env.production`, and updater dependencies. |

## Build Notes

- First build attempt exposed a real type issue in the new save code: `InputAssetRef` has `clientUrl`, not `url`.
- The issue was fixed by using `workflowData.inputAsset?.clientUrl` as the original URL fallback.
- Final `npm run build` passed.
- Remaining console warnings are dependency freshness warnings for `baseline-browser-mapping` and `caniuse-lite`; they do not block the build.

## Manual Smoke Still Recommended

Provider-backed scene generation depends on local provider credentials, model availability, storage URL accessibility, and worker trigger behavior. Before release, run the human verification tests from the frontmatter against a configured local account.

## Deferred Items

- Full typed workflow API and worker handler decomposition: Phase 5.
- Unified smart toolbox: Phase 4.
- Old frontend removal and Electron/Windows regression hardening: Phase 6.
- Provider health check UX: later settings/runtime quality pass.