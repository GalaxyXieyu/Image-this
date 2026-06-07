# Phase 6 Context: Old Frontend Removal and Regression Hardening

**Created:** 2026-06-08
**Status:** In progress
**Depends on:** Phase 5 complete
**Branch:** `feature/ai-studio-2-commerce-workbench`

## Why this phase exists

The rebuild branch has been accumulating old and unused code alongside new implementations. This phase removes dead code, verifies all active flows work, and ensures the Electron/Windows baseline hasn't degraded.

## Current state assessment

**Already removed in earlier phases:**
- `src/stores/` — old Zustand stores (already deleted)
- `src/features/` — old feature directories (already deleted)
- Historical phase planning folders (01, 02, 03) — deleted in Phase 5 cleanup
- Old `src/components/workspace/` — replaced by `src/components/workbench/`

**What still needs cleanup:**
- `src/hooks/useInfiniteScroll.ts` — unused, references old infinite scroll pattern
- `src/hooks/useUserPreferences.ts` — unused, old preferences hook
- `src/app/api/images-process/workflow/one-click/` — verify still needed (used by one-click handler)
- Verify no orphaned imports or dead code paths

**What needs verification:**
- `npm run build` passes
- All active pages render without errors
- Task creation and polling work end-to-end
- Electron build doesn't break

## Phase boundary

In scope:
- Remove unused hooks and components
- Verify all active pages and flows
- Run smoke tests
- Check Electron baseline
- Update documentation

Out of scope:
- Refactoring working code
- Adding new features
- Changing UI/UX
- Windows packaging (just verify build passes)

## Success criteria

1. No unused files remain in `src/hooks/`, `src/components/`
2. `npm run build` passes with zero errors
3. Smoke test script passes for core flows
4. Electron dev build starts without errors
5. Old workspace references removed from navigation/links

## Risks

- Deleting a file that has a dynamic import (hard to detect statically)
- Breaking Electron-specific code paths
- Removing something that's conditionally used
