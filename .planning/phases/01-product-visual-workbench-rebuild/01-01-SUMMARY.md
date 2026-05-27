---
phase: "01"
plan: "01-01"
subsystem: "frontend"
tags: ["workbench", "foundation", "types", "routes", "layout"]
dependency_graph:
  requires: []
  provides: ["01-02", "01-03", "02-01", "03-01", "04-01"]
  affects: ["src/app/workspace/page.tsx"]
tech-stack:
  added:
    - "Next.js App Router route groups"
    - "Typed workflow domain types"
    - "Compatibility adapter pattern"
  patterns:
    - "Feature-first directory structure"
    - "Shell/Canvas/Panel layout primitives"
    - "Typed API contract with legacy bridge"
key-files:
  created:
    - "src/types/workbench/index.ts"
    - "src/lib/workbench/api-contract.ts"
    - "src/hooks/workbench/useWorkflowTaskPolling.ts"
    - "src/components/workbench/WorkbenchShell.tsx"
    - "src/components/workbench/WorkbenchTopNav.tsx"
    - "src/components/workbench/WorkbenchSidebar.tsx"
    - "src/components/workbench/WorkbenchCanvas.tsx"
    - "src/components/workbench/WorkbenchDetailPanel.tsx"
    - "src/components/workbench/WorkbenchActionBar.tsx"
    - "src/components/workbench/StepBar.tsx"
    - "src/app/workbench/page.tsx"
    - "src/app/templates/page.tsx"
    - "src/app/workspace/scene/page.tsx"
    - "src/app/tools/background/page.tsx"
    - "src/app/tools/watermark/page.tsx"
    - "src/app/tools/outpaint/page.tsx"
    - "src/app/tools/upscale/page.tsx"
    - "src/app/tools/video/page.tsx"
    - ".planning/phases/01-product-visual-workbench-rebuild/MIGRATION_NOTES.md"
  modified:
    - "src/app/globals.css"
decisions:
  - "New workbench routes coexist with old /workspace during migration"
  - "Typed workflow types use lowercase status values for client consistency"
  - "Legacy TaskQueue compatibility adapter lives in api-contract.ts"
  - "Design tokens added as CSS custom properties alongside existing Tailwind theme"
  - "useWorkflowTaskPolling replaces useTaskPolling incrementally"
metrics:
  duration: "~8h15m"
  completed_date: "2026-05-27"
  tasks_completed: 8
  files_created: 19
  files_modified: 1
---

# Phase 01 Plan 01: Product Visual Workbench Foundation Summary

**One-liner:** Created the complete foundation for the new AI product visual workbench including typed domain models, layout primitives, route skeletons, and a legacy-compatible API contract layer.

## What Was Built

### 1. Inventory & Migration Notes
Documented reusable vs disposable frontend code in `MIGRATION_NOTES.md`:
- **Keep:** ImageUploadArea, WatermarkEditorView, TaskProgress, ResultModal, useImageUpload, useImageProcessing
- **Deprecate:** useWorkspaceTabStore (replace with feature-specific stores)
- **Delete Later:** Old workspace page, WorkspaceSidebar, ParameterSettings, ActionButtons

### 2. Route Skeletons
New routes using the workbench shell:
| Route | Purpose |
|-------|---------|
| `/` | Homepage (existing) |
| `/templates` | Template library placeholder |
| `/workspace/scene` | Scene workflow 3-step page |
| `/tools/background` | AI background replacement tool |
| `/tools/watermark` | Watermark tool |
| `/tools/outpaint` | Image outpainting tool |
| `/tools/upscale` | Image upscaling tool |
| `/tools/video` | Video generation tool |
| `/workbench` | Redirects to `/` |

### 3. Layout Primitives
Seven reusable layout components:
- `WorkbenchShell` - Root flex container
- `WorkbenchTopNav` - Compact breadcrumb header
- `WorkbenchSidebar` - Left nav with workflow + toolbox sections
- `WorkbenchCanvas` - Main scrollable content area
- `WorkbenchDetailPanel` - Collapsible right settings panel (320px default)
- `WorkbenchActionBar` - Bottom action bar with primary/secondary actions
- `StepBar` - Horizontal step indicator for multi-step workflows

### 4. Design Tokens
Added workbench-specific CSS custom properties to `globals.css`:
- Neutral palette: surface, border, text (primary/secondary/tertiary)
- Accent colors: blue system for actions
- Panel dimensions: sidebar 224px, topnav 56px, actionbar 56px, detail 320px

### 5. Workflow Domain Types
Comprehensive typed entities in `src/types/workbench/index.ts`:
- `SceneWorkflow` with 3-step status tracking
- `ToolRun` with parameter unions per tool type
- `TemplatePreset` for scene/tool/prompt presets
- `BatchGroup` for batch processing management
- `WorkflowTask` mapping to TaskQueue
- Draft types: `SceneWorkflowDraft`, `ToolRunDraft`
- Compatibility functions: `WORKFLOW_TO_LEGACY_TYPE`, `legacyTypeToWorkflowType`, `buildLegacyInputData`

### 6. Typed API Contract
Request/response schemas in `src/lib/workbench/api-contract.ts`:
- `CreateWorkflowTaskRequest/Response`
- `CreateBatchWorkflowTasksRequest/Response`
- `ListWorkflowTasksRequest/Response`
- `BatchTaskStatusRequest/Response`
- `CreateSceneWorkflowRequest/Response`
- `CreateToolRunRequest/Response`
- Compatibility adapters: `adaptToLegacyTaskRequest`, `adaptLegacyTaskToSummary`

### 7. Centralized Task Polling
`useWorkflowTaskPolling` hook features:
- Batch group support
- Individual task tracking
- Auto-start/stop lifecycle
- Callbacks: onTaskComplete, onTaskFail, onStatusChange, onAllComplete
- Toast notifications for status transitions
- Error handling with retry

### 8. Build Verification
- `npm run build` passes successfully
- All new routes compile without errors
- Existing API routes untouched
- Old workspace page still functional

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

The following placeholder content exists in route pages and will be resolved in later phases:

| File | Line | Stub | Resolution Plan |
|------|------|------|-----------------|
| `src/app/templates/page.tsx` | 12-15 | Static placeholder text | Phase 2: Template library data |
| `src/app/workspace/scene/page.tsx` | 19-24 | Static step content | Phase 3: Scene workflow implementation |
| `src/app/tools/*/page.tsx` | 12-18 | Static tool placeholder | Phase 4: Tool editor implementations |
| `src/app/tools/*/page.tsx` | 22-24 | "参数将在后续阶段实现" | Phase 4: Tool parameter panels |

## Self-Check: PASSED

- [x] All 19 created files exist
- [x] Commit `76e3589` exists in git history
- [x] `npm run build` passes
- [x] No provider behavior changed
- [x] Old routes still reachable
