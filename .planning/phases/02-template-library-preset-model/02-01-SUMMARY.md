---
phase: "02"
plan: "02-01"
subsystem: "template-library"
tags: ["template", "preset", "ui", "workbench"]
dependency_graph:
  requires: ["01-01"]
  provides: ["02-02", "03-01", "04-01"]
  affects: ["src/types/workbench", "src/app/templates", "src/lib/workbench/presets"]
tech_stack:
  added: []
  patterns: ["static-seed", "url-state-sync", "suspense-boundary"]
key_files:
  created:
    - src/lib/workbench/presets.ts
    - src/components/templates/TemplateSidebar.tsx
    - src/components/templates/TemplateGrid.tsx
    - src/components/templates/TemplateCard.tsx
    - src/components/templates/TemplateDetailPanel.tsx
    - src/components/workbench/PresetLoader.tsx
  modified:
    - src/types/workbench/index.ts
    - src/app/templates/page.tsx
    - src/app/tools/background/page.tsx
decisions:
  - "Static seed data for presets (no DB migration in this phase)"
  - "VideoParams added to ToolParameters union for video preset compatibility"
  - "PresetLoader component pattern for reading ?preset= across tool pages"
  - "Suspense boundary required for useSearchParams in Next.js 15 static generation"
metrics:
  duration_minutes: 42
  completed_date: "2026-05-27"
  tasks_total: 8
  tasks_completed: 8
---

# Phase 2 Plan 02-01: Template Library and Preset Model Summary

## One-liner

Template library page with three-column layout matching Pencil design, 20 system presets + 2 combos, typed data model, search/filter, and preset-to-workflow navigation.

## What Was Built

### Data Model (Task 1)
- Extended `src/types/workbench/index.ts` with `TemplatePreset`, `ComboPreset`, `PresetCategory`, `PresetType`, `PresetToolType`
- Preset params typed as `Partial<SceneWorkflowDraft> | Partial<ToolRunDraft>`
- Added `VideoParams` to `ToolParameters` union for video preset support

### Seed Data (Task 2)
- Created `src/lib/workbench/presets.ts` with 20 presets across 6 categories:
  - 5 listing presets (上架图)
  - 3 whitebg presets (白底图)
  - 4 scene presets (场景图)
  - 3 poster presets (海报设计)
  - 2 video presets (短视频)
  - 3 image-process presets (图片处理)
- 2 combo presets: 淘宝全套素材, 抖音带货套装
- Helper functions: `getPresetsByCategory`, `searchPresets`, `getPresetById`, `getPresetsSortedByUsage`, `getPresetsSortedByDate`

### Page Layout (Task 3)
- `src/app/templates/page.tsx` with three-column layout:
  - Left sidebar: 260px with categories, combos, function nav
  - Center: search toolbar + responsive template grid
  - Right detail panel: 320px with preview, metadata, actions
- Uses `WorkbenchShell` + `WorkbenchTopNav` from Phase 1

### Template Grid and Cards (Task 4)
- `TemplateCard`: 280px height, 12px radius, 1px border, image area 160px
- Exact Pencil styling: Inter headings, Geist body, primary #0066FF
- Hover state: border color change + shadow
- Selection state: ring-2 ring-primary

### Detail Panel (Task 5)
- `TemplateDetailPanel`: 320px width, preview area 180px
- Metadata: name, description, category badge, usage count, version, tags
- Collapsible parameters preview
- Action buttons: "使用此模板" (primary), "收藏"/"分享" (stubs)

### Search and Filter (Task 6)
- Real-time search by name, description, tags
- Sort dropdown: "最新发布" / "最受欢迎"
- Category click filters templates
- Combo click filters to combo members
- URL state sync for category, combo, preset

### Workflow Entry (Task 7)
- "使用此模板" navigates based on preset type:
  - `scene` -> `/workspace/scene?preset={id}`
  - `tool` -> `/tools/{toolType}?preset={id}`
  - `combo` -> `/workbench?preset={id}`
- Created `PresetLoader` component for reading ?preset= query param
- Wired into background tool page as pattern for other tools

### Build Verification (Task 8)
- `npm run build` passes successfully
- All routes render without errors
- TypeScript types are consistent across presets and components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed PresetCategory import path**
- **Found during:** Build verification (Task 8)
- **Issue:** `TemplateSidebar.tsx` imported `PresetCategory` from `@/lib/workbench/presets` but it was only exported from `@/types/workbench`
- **Fix:** Changed import to `@/types/workbench`
- **Files modified:** `src/components/templates/TemplateSidebar.tsx`
- **Commit:** 05e5e19

**2. [Rule 2 - Missing Critical Functionality] Added VideoParams type**
- **Found during:** Build verification (Task 8)
- **Issue:** Video presets used `toolType: "video_generation"` which was not in `ToolType` union, and their parameters didn't match any `ToolParameters` shape
- **Fix:** Added `'video_generation'` to `ToolType`, created `VideoParams` interface, added to `ToolParameters` union, updated `buildLegacyInputData` switch case
- **Files modified:** `src/types/workbench/index.ts`
- **Commit:** 05e5e19

**3. [Rule 1 - Bug] Added Suspense boundary for useSearchParams**
- **Found during:** Build verification (Task 8)
- **Issue:** Next.js 15 static generation failed because `useSearchParams()` was not wrapped in Suspense
- **Fix:** Split page into `TemplatesPageInner` (uses hooks) and `TemplatesPage` (wraps in Suspense with fallback layout)
- **Files modified:** `src/app/templates/page.tsx`
- **Commit:** 05e5e19

**4. [Rule 1 - Bug] Fixed ALL_PRESETS import**
- **Found during:** Build verification (Task 8)
- **Issue:** After refactoring imports, `ALL_PRESETS` was used but not imported in page.tsx
- **Fix:** Added `ALL_PRESETS` to the import from `@/lib/workbench/presets`
- **Files modified:** `src/app/templates/page.tsx`
- **Commit:** 05e5e19

## Auth Gates

None.

## Known Stubs

1. **收藏/分享 buttons** in `TemplateDetailPanel.tsx` (line 191-198)
   - Actions are UI stubs without backend implementation
   - Reason: User favorites/sharing out of scope for this phase
   - Future plan: Phase 5+ when user preferences and social features are implemented

2. **PresetLoader only logs preset info**
   - `PresetLoader.tsx` reads ?preset= and logs to console but does not initialize draft state
   - Reason: Draft state management requires Phase 3 (scene workflow) and Phase 4 (toolbox) implementations
   - Future plan: Phase 3/4 will wire PresetLoader into actual draft initialization

3. **Tool pages only have placeholder content**
   - `/tools/background`, `/tools/watermark`, etc. show placeholder text
   - Reason: Tool implementations are Phase 4 scope
   - Future plan: Phase 4 will replace placeholders with actual tool editors

## Self-Check

### Created files exist
- FOUND: src/lib/workbench/presets.ts
- FOUND: src/components/templates/TemplateSidebar.tsx
- FOUND: src/components/templates/TemplateGrid.tsx
- FOUND: src/components/templates/TemplateCard.tsx
- FOUND: src/components/templates/TemplateDetailPanel.tsx
- FOUND: src/components/workbench/PresetLoader.tsx

### Modified files exist
- FOUND: src/types/workbench/index.ts
- FOUND: src/app/templates/page.tsx
- FOUND: src/app/tools/background/page.tsx

### Commits exist
- FOUND: 530adec - feat(02-01): define TemplatePreset data model
- FOUND: 5eb725c - feat(02-01): create system preset seed data
- FOUND: 910358f - feat(02-01): implement template library page
- FOUND: 05e5e19 - fix(02-01): resolve TypeScript build errors
- FOUND: 16caa8d - feat(02-01): add PresetLoader component

### Build passes
- PASSED: npm run build completes successfully

## Self-Check: PASSED
