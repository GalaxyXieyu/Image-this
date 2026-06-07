---
phase: 04a-brand-ui-ux-optimization
plan: 02
subsystem: ui
tags: [tailwind, shadcn, brand-tokens, semantic-colors, badge, button]

requires:
  - phase: 04a-brand-ui-ux-optimization
    provides: "Unified token system with brand colors, AI colors, and gradient utilities"
provides:
  - "Core workbench pages use semantic Tailwind token classes instead of hardcoded hex"
  - "Task status badges use semantic variants (warning/processing/success/danger)"
  - "Button brand variant applied consistently across CTA buttons"
  - "Tailwind config extended with primary-hover, success, warning, danger, processing color tokens"
affects:
  - "04a-wave-3: Remaining pages and components"
  - "04a-wave-4: Dark mode verification"

tech-stack:
  added: []
  patterns:
    - "Use variant='brand' for primary CTA buttons instead of className bg overrides"
    - "Use semantic Badge variants for status indicators"
    - "Use text-primary / bg-primary for brand color references"
    - "Use slate-400 / slate-500 for muted text instead of hardcoded gray hexes"

key-files:
  created: []
  modified:
    - "config/tailwind.config.js - Added primary-hover, success, warning, danger, processing color tokens"
    - "src/app/workspace/scene/page.tsx - Replaced all #0066FF/#0052CC with tokens; semantic status badges"
    - "src/app/tools/page.tsx - Replaced hardcoded colors with tokens"
    - "src/app/tasks/page.tsx - Semantic status Badge variants; replaced text-blue-600 with text-processing"
    - "src/app/results/page.tsx - Replaced hardcoded colors with tokens"
    - "src/app/combo/page.tsx - Replaced hardcoded colors with tokens"
    - "src/app/page.tsx - Replaced hardcoded colors with tokens; home page CTA uses variant=brand"
    - "src/components/navigation/FloatingTaskButton.tsx - Replaced all hardcoded colors with tokens"
    - "src/components/templates/TemplateCard.tsx - Replaced #999999/#666666 with slate tokens"
    - "src/app/not-found.tsx - Replaced inline #2563eb with text-primary"

key-decisions:
  - "Extended tailwind.config.js with full semantic color objects (DEFAULT/foreground/soft) for success, warning, danger, processing to support both solid and soft badge variants"
  - "Added primary-hover token (#1D4ED8) to tailwind config to support hover states via Tailwind classes"
  - "Converted getCandidateStatusClassName to getCandidateStatusVariant in scene page to return semantic Badge variant names instead of raw class strings"
  - "Converted StatusBadge in tasks page from custom span to Badge component with semantic variants"

patterns-established:
  - "Primary CTA buttons: use variant='brand' instead of className bg-[#0066FF] overrides"
  - "Status indicators: use Badge with semantic variants (warning/processing/success/danger)"
  - "Progress bars: use bg-primary for fill indicator"
  - "Top nav brand indicator: use bg-primary instead of hardcoded hex"
  - "Muted text: use text-slate-400 / text-slate-500 instead of #999 / #666"

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-06-07
---

# Phase 04a Plan 02: Core Workbench Pages Brand Alignment Summary

**Replaced all hardcoded brand hex colors with semantic Tailwind tokens across 9 core files, added missing color tokens to tailwind config, and converted status badges to use semantic variants.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-07T01:33:23Z
- **Completed:** 2026-06-07T01:38:12Z
- **Tasks:** 9 (one per file)
- **Files modified:** 10

## Accomplishments
- Replaced 25+ occurrences of `#0066FF` and `#0052CC` across core workbench pages
- Added missing semantic color tokens to tailwind.config.js: `primary-hover`, `success`, `warning`, `danger`, `processing`
- Converted scene page candidate status badges from raw class strings to semantic Badge variants
- Converted tasks page StatusBadge from custom span to Badge component with semantic variants
- Verified no LUMO/IP images in core editing areas (workspace canvas, tools canvas, task center)
- Build passes with zero errors

## Task Commits

Each file was committed atomically:

1. **Task 1: Tailwind config + workspace/scene** - `b24d17b` (feat)
2. **Task 2: tools page** - `ac89c0c` (feat)
3. **Task 3: tasks page** - `5c1e0eb` (feat)
4. **Task 4: results page** - `a31a46d` (feat)
5. **Task 5: combo page** - `4f5e780` (feat)
6. **Task 6: home page** - `910381b` (feat)
7. **Task 7: FloatingTaskButton** - `b7fa15e` (feat)
8. **Task 8: TemplateCard** - `53c9f37` (feat)
9. **Task 9: not-found** - `d9acf57` (feat)

## Files Created/Modified
- `config/tailwind.config.js` - Added primary-hover, success, warning, danger, processing color tokens with DEFAULT/foreground/soft subkeys
- `src/app/workspace/scene/page.tsx` - Replaced all #0066FF/#0052CC; Badge variant=processing; candidate status uses semantic variants
- `src/app/tools/page.tsx` - Replaced hardcoded colors; CTA uses variant=brand; progress bar uses bg-primary
- `src/app/tasks/page.tsx` - StatusBadge uses Badge component with warning/processing/success/danger variants
- `src/app/results/page.tsx` - Replaced top nav bg-[#0066FF] with bg-primary
- `src/app/combo/page.tsx` - Replaced hardcoded colors; step badge uses bg-primary; CTA uses variant=brand
- `src/app/page.tsx` - Replaced hardcoded colors; hero CTA uses variant=brand; icons use text-primary
- `src/components/navigation/FloatingTaskButton.tsx` - Replaced all hardcoded colors with tokens
- `src/components/templates/TemplateCard.tsx` - Replaced #999999 with text-slate-400, #666666 with text-slate-500, #0066FF with text-primary
- `src/app/not-found.tsx` - Replaced inline style #2563eb with text-primary class

## Decisions Made
- Extended tailwind.config.js with full color objects (DEFAULT/foreground/soft) for semantic status colors to support both the Badge component's soft variants and any future solid variant needs
- Added `primary-hover` as a subkey under `primary` in tailwind config to enable `hover:bg-primary-hover` class usage
- Chose to replace `className="bg-[#0066FF]..."` patterns with `variant="brand"` on Button components rather than just swapping to `bg-primary`, to leverage the centralized CVA variant definition

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Tailwind config used tab indentation which required careful string matching for the Edit tool; resolved by rewriting the file with the updated token structure
- Initial verification grep for tasks page badge variants used a string literal pattern that didn't match the variable-based `variant={variantMap[status]}` usage; verified manually that semantic variants are correctly mapped

## Known Stubs

No stubs found that prevent the plan's goal from being achieved. All hardcoded brand colors have been replaced with token classes.

## Next Phase Readiness
- All core workbench pages are brand-aligned and ready for Wave 3 (remaining pages and components)
- Token system is complete and verified working
- Semantic Badge and Button variants are available for all future UI work

## Self-Check: PASSED

- [x] All modified files exist and compile
- [x] All commits exist in git history
- [x] `npm run build` passes with zero errors
- [x] No hardcoded #0066FF or #0052CC remains in src/
- [x] No LUMO/IP in core editing areas

---
*Phase: 04a-brand-ui-ux-optimization*
*Completed: 2026-06-07*
