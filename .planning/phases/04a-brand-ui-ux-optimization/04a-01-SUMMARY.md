---
phase: 04a-brand-ui-ux-optimization
plan: 01
wave: 1
subsystem: design-system
tags: [css, tokens, tailwind, shadcn, components]
dependency_graph:
  requires: []
  provides: [04a-02, 04a-03, 04a-04]
  affects: [src/components/ui/*, src/app/globals.css, config/tailwind.config.js]
tech_stack:
  added: []
  patterns:
    - "Layered CSS token architecture: design-system/ + domains/ + utilities/"
    - "Semantic Tailwind classes in CVA (no hardcoded hex)"
    - "Tailwind v3 @theme blocks for CSS custom properties"
key_files:
  created:
    - src/styles/design-system/tokens.css
    - src/styles/domains/workbench.css
    - src/styles/utilities/brand.css
  modified:
    - src/app/globals.css
    - config/tailwind.config.js
    - src/components/ui/button.tsx
    - src/components/ui/badge.tsx
    - src/components/ui/progress.tsx
decisions:
  - "Tailwind v3 @theme blocks are valid in imported CSS files when the entry file has @tailwind directives"
  - "CVA variants use semantic Tailwind classes (bg-primary, text-ai) instead of arbitrary values (bg-[#2563FF])"
  - "Tailwind config extended with ai, success-soft, warning-soft, danger-soft, processing-soft colors for class resolution"
metrics:
  duration_minutes: ~25
  completed_date: "2026-06-07"
  tasks: 4
  files_created: 3
  files_modified: 5
---

# Phase 04a Plan 01: Brand Token and Component Baseline Summary

**One-liner:** Reorganized CSS tokens into a layered design-system architecture and extended Button/Badge/Progress with brand-compliant semantic variants using Tailwind token classes.

## What Was Built

### Layered Token Architecture

Created three new CSS files under `src/styles/`:

1. **`src/styles/design-system/tokens.css`** — Generic design tokens:
   - Brand Primary: `--color-primary: #2563FF`, `--color-primary-hover: #1D4ED8`
   - AI Accent: `--color-ai: #7C3AED`, `--color-ai-soft: #EDE9FE`
   - Status colors: success, warning, danger, processing (with soft variants)
   - Neutral slate scale: 50-950
   - shadcn overrides mapped to brand
   - Dark mode `@media (prefers-color-scheme: dark)` block

2. **`src/styles/domains/workbench.css`** — Workbench-specific tokens:
   - Surface colors: `--color-wb-surface`, `--color-wb-surface-raised`, `--color-wb-surface-inset`
   - Text hierarchy: `--color-wb-text`, `--color-wb-text-secondary`, `--color-wb-text-tertiary`
   - Accent mapped to brand: `--color-wb-accent: #2563FF`
   - Layout dimensions: sidebar width, topnav height, actionbar height, etc.
   - Dark mode block

3. **`src/styles/utilities/brand.css`** — Brand gradient utilities:
   - `.bg-brand-gradient`: `#2563FF -> #7C3AED`
   - `.bg-brand-gradient-light`: `#DBEAFE -> #EDE9FE -> #FFFFFF`
   - `.bg-brand-gradient-dark`: `#020617 -> #1E1B4B -> #2563FF`
   - `.text-brand-gradient`: gradient text clip

### Entry Point (`src/app/globals.css`)

Rewritten as a thin entry point:
- `@tailwind base; @tailwind components; @tailwind utilities;`
- `@import`s the three layered token files
- Preserves shadcn `@layer base` HSL tokens (aligned to brand)
- Preserves legacy `:root` CSS variables (backward compatible)
- Preserves custom scrollbar and animation utilities

### Extended Components

**Button (`src/components/ui/button.tsx`):**
- `brand`: `bg-primary text-primary-foreground hover:bg-primary-hover`
- `ai`: `bg-ai text-ai-foreground hover:bg-ai-hover`
- `gradient`: `bg-brand-gradient text-white hover:opacity-90`
- `xs`: `h-7 rounded px-2 text-xs gap-1`

**Badge (`src/components/ui/badge.tsx`):**
- `ai`: `bg-ai-soft text-ai hover:bg-ai-light`
- `success`: `bg-success-soft text-success`
- `warning`: `bg-warning-soft text-warning`
- `danger`: `bg-danger-soft text-danger`
- `processing`: `bg-processing-soft text-processing`

**Progress (`src/components/ui/progress.tsx`):**
- Fill uses `bg-primary` (brand blue via token system)
- Added `duration-300 ease-out` for smooth progress transitions

### Tailwind Config Update

Extended `config/tailwind.config.js` colors:
- `ai` (with DEFAULT, foreground, hover, soft, light)
- `success-soft`, `warning-soft`, `danger-soft`, `processing-soft`

## Verification Results

- `npm run build`: PASSED (zero errors)
- `npx eslint` on modified components: PASSED (no new errors)
- Existing variant call sites: 58 usages confirmed intact
- No hardcoded hex (`bg-[`) in button.tsx or badge.tsx CVA

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tailwind v3 `@theme` in imported CSS files caused build failure**
- **Found during:** Task 1
- **Issue:** The original `globals.css` used `@theme` blocks directly. When tokens were extracted to imported files, the `@theme` blocks in `tokens.css` and `workbench.css` were not being processed because `@import` in CSS runs before Tailwind's `@theme` processing.
- **Fix:** Kept `@theme` blocks in the imported files (they are valid Tailwind v3 syntax) and ensured the entry `globals.css` has `@tailwind base/components/utilities` before the `@import`s. The build passes because Tailwind's PostCSS plugin processes all CSS in the dependency graph.
- **Files modified:** `src/app/globals.css`, `src/styles/design-system/tokens.css`, `src/styles/domains/workbench.css`
- **Commit:** aff58b6

**2. [Rule 3 - Blocking] `@layer utilities` in imported file caused "no matching @tailwind utilities" error**
- **Found during:** Task 1
- **Issue:** `brand.css` contained `@layer utilities` but when imported into `globals.css`, the `@tailwind utilities` directive was after the `@import`s.
- **Fix:** Moved `@tailwind base; @tailwind components; @tailwind utilities;` to the TOP of `globals.css`, before the `@import` statements. This ensures Tailwind directives are processed first.
- **Files modified:** `src/app/globals.css`
- **Commit:** aff58b6

**3. [Rule 2 - Missing Critical] Tailwind config missing semantic color definitions**
- **Found during:** Task 1 (build verification)
- **Issue:** Tailwind v3 does not automatically generate classes like `bg-ai-soft` or `text-processing` from CSS custom properties alone. The `@theme` block defines CSS variables, but Tailwind's JIT engine needs config entries to generate utility classes.
- **Fix:** Extended `config/tailwind.config.js` `theme.extend.colors` with `ai`, `success-soft`, `warning-soft`, `danger-soft`, and `processing-soft` color definitions.
- **Files modified:** `config/tailwind.config.js`
- **Commit:** aff58b6

## Known Stubs

None. All tokens are fully defined with real hex values. All component variants resolve to concrete Tailwind classes.

## Commits

| Hash | Message | Files |
|------|---------|-------|
| aff58b6 | feat(04a-01): reorganize CSS tokens into layered design system | src/styles/*, src/app/globals.css, config/tailwind.config.js |
| 3aba0da | feat(04a-01): extend Button with brand, ai, and gradient variants | src/components/ui/button.tsx |
| 57b592f | feat(04a-01): extend Badge with semantic status variants | src/components/ui/badge.tsx |
| 9024aba | feat(04a-01): add smooth transition to Progress indicator | src/components/ui/progress.tsx |

## Self-Check: PASSED

- [x] `src/styles/design-system/tokens.css` exists and contains `--color-primary: #2563FF`
- [x] `src/styles/domains/workbench.css` exists and contains `--color-wb-accent: #2563FF`
- [x] `src/styles/utilities/brand.css` exists and contains `.bg-brand-gradient`
- [x] `src/app/globals.css` imports all three token files
- [x] `src/components/ui/button.tsx` has `brand`, `ai`, `gradient` variants
- [x] `src/components/ui/badge.tsx` has `ai`, `success`, `warning`, `danger`, `processing` variants
- [x] `src/components/ui/progress.tsx` uses `bg-primary` with `duration-300 ease-out`
- [x] `npm run build` passes with zero errors
- [x] All 4 commits exist in git history
