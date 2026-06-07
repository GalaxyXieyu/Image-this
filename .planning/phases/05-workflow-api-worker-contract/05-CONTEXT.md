# Phase 5 Context: Workflow API and Worker Contract Refactor

**Created:** 2026-06-07
**Status:** Ready for execution
**Depends on:** Phase 4 (Unified Smart Toolbox) completed
**Branch:** `feature/ai-studio-2-commerce-workbench`

## Why this phase exists

The current task system stores loose JSON strings in `TaskQueue.inputData` and `TaskQueue.outputData`. Frontend adapters construct these strings, the worker parses them with `JSON.parse()`, and result extraction is defensive (`try/catch` everywhere). This was acceptable for early development but creates maintenance risk:

- Adding a new task type requires editing the worker switch statement
- Result shapes vary by processor with no contract
- The combo page already has a latent bug (wrong task type names)
- No runtime validation that a task's input matches what its processor expects

## Current canonical design baseline

Phase 4 established typed frontend contracts (`WorkflowType`, `ToolParameters`, `InputAssetRef`). Phase 5 bridges those contracts into the backend.

## Decisions

| Decision | Result |
|---|---|
| Keep legacy `/api/tasks` endpoint | Backward compatibility; old tasks and external callers still work |
| Add `contractVersion` to TaskQueue | v1 = legacy loose JSON, v2 = typed workflow contract; enables incremental migration |
| Decouple task type from handler name | `handlerName` field lets the registry be the single source of truth |
| Extract worker handlers one at a time | The worker is 1200 lines with no tests; incremental extraction is safer |
| Preserve base64 whitelist guard | Even with typed results, the final safety layer stays |
| SQLite schema changes use `@default()` | Existing desktop user data must not break |

## Phase boundary

In scope:
- Prisma schema additions (contractVersion, workflowType, handlerName)
- Worker handler registry and typed handler interface
- Extracting each processor into a handler (incremental)
- Creating `/api/workflow/tasks` typed endpoints
- Migrating frontend adapters to use new endpoints
- Fixing combo page task type bug
- Result contract types

Out of scope:
- Removing the legacy `/api/tasks` endpoint (keep for compat)
- Changing TaskQueue primary key or core fields
- Introducing heavy validation libraries (Zod is fine if already present)
- Full test suite for handlers (smoke verification only)
- Database migration scripts (use `prisma db push` with defaults)

## Success criteria

1. New UI doesn't directly construct arbitrary `TaskQueue.inputData` strings.
2. Worker dispatches by typed workflow/tool handler registry.
3. Result payloads have consistent base interface with per-type extensions.
4. Old tasks (contractVersion = 1) remain readable in `/tasks` and `/results`.
5. Combo page creates tasks with correct type names.
6. `npm run build` passes after each wave.

## Risks

- Worker is a single 1200-line file with no tests — extract incrementally
- Task type name drift already exists between frontend and worker
- ProcessedImage creation is duplicated across 6 processors
- User config injection mutates task.inputData as a side effect
- SQLite schema changes on deployed desktop builds

## Canonical references

- `.planning/phases/05-workflow-api-worker-contract/05-RESEARCH.md`
- `src/app/api/tasks/worker/route.ts`
- `src/app/api/tasks/route.ts`
- `src/lib/workbench/api-contract.ts`
- `src/lib/workbench/task-compat.ts`
- `src/lib/workbench/tool-task-adapter.ts`
- `src/lib/workbench/scene-task-adapter.ts`
- `src/types/workbench/index.ts`
- `prisma/schema.prisma`
- `src/app/combo/page.tsx`
