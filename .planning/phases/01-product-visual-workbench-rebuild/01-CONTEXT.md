# Phase 1: Product Visual Workbench Foundation - Context

**Gathered:** 2026-05-27
**Status:** Ready for planning
**Source:** User request + Pencil design + codebase scan

<domain>

## Phase Boundary

This phase prepares the codebase for the new product workbench. It should not attempt to finish every page. It should create the structural foundation that makes later page builds straightforward and avoids repeating the current monolithic workspace pattern.

</domain>

<decisions>

## Implementation Decisions

### UX Source of Truth

- The new `.pen` design is authoritative for information architecture and page structure.
- Old workspace visual behavior can be removed.
- Keep the old backend integrations where useful.

### Architecture Direction

- Split the new frontend by feature under `src/features`.
- Keep route pages thin.
- Use shared workbench layout primitives for nav, side panels, canvas, detail panels, and action bars.
- Replace the old tab-specific Zustand shape with a workflow-oriented state model.

### API Direction

- Define typed contracts before rewriting worker internals.
- Keep `/api/tasks` compatibility during migration.
- Add a clearer workflow submission layer for new UI.

### the agent's Discretion

- Exact route names may be chosen to fit Next.js conventions.
- Components can use shadcn/ui primitives, custom Tailwind, and lucide icons.
- Implementation can create temporary adapter layers if that reduces migration risk.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Product and Design

- `.planning/PROJECT.md` - project purpose and rebuild constraints.
- `.planning/REQUIREMENTS.md` - functional requirements and acceptance criteria.
- `.planning/ROADMAP.md` - phase sequencing.
- `/Users/galaxyxieyu/Documents/image-this.pen` - visual and IA source.

### Existing Frontend

- `src/app/workspace/page.tsx` - monolithic old workspace to replace.
- `src/stores/useWorkspaceTabStore.ts` - old tab state shape.
- `src/components/workspace/WorkspaceSidebar.tsx` - old tool taxonomy.
- `src/components/workspace/*` - reusable pieces and deletion candidates.

### Existing Backend

- `src/app/api/tasks/route.ts` - task creation/listing contract.
- `src/app/api/tasks/worker/route.ts` - worker dispatch and processing.
- `src/app/api/images-process/workflow/one-click/service.ts` - existing composed image workflow.
- `src/lib/image-processor/*` - provider abstraction.
- `prisma/schema.prisma` - persistence baseline.

</canonical_refs>

<specifics>

## Specific Ideas

- Build a new `src/features/workbench` module for shell/layout/components.
- Build a new `src/features/workflows` or `src/features/product-visuals` module for typed workflow state.
- Introduce API schema files such as `src/lib/workflows/contracts.ts`.
- Route candidates:
  - `/templates`
  - `/workspace/scene`
  - `/workspace/scene/generate`
  - `/workspace/scene/adjust`
  - `/tools`
  - `/tools/background`
  - `/tools/watermark`
  - `/tools/upscale`
- Keep old route redirects only if needed for discoverability.

</specifics>

<deferred>

## Deferred Ideas

- Final DB migration for template/preset models can be Phase 2.
- Full worker handler split can be Phase 5.
- Deleting old UI should wait until Phase 6 after new flows are verified.

</deferred>

