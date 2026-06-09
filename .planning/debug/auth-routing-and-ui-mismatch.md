---
status: investigating
trigger: "Goal: find_root_cause_first. Symptoms: User reports that when not logged in, visiting the task center (/tasks) stays on the page and shows an Unauthorized/未授权访问 panel instead of redirecting back to the intended entry/login/home screen. User also reports the login/register UI does not match their Pencil design: blue brand panel on the left, white form panel on the right, compact centered auth card. Attached screenshots show /tasks unauthenticated with nav/header and a red 未授权访问 card, and a Pencil mockup showing 注册页 with blue left branding and right form plus 首页 design. Please inspect the codebase read-only, identify the exact root causes and relevant files/lines, and propose the smallest safe fix. Do not edit files. Check auth route/page components, protected pages/API behavior, middleware if any, and current product routing conventions from CLAUDE.md."
created: 2026-06-09T00:00:00Z
updated: 2026-06-09T00:00:00Z
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

hypothesis: /tasks is an unguarded client page that fetches a protected API and renders api-client's 401 message in its own error card; auth pages use generic single Card layout instead of the Pencil two-panel layout.
test: Inspect API tasks route and api-client to confirm 401 response/message path, and inspect app root/home routing conventions for intended entry.
expecting: API route returns 401 Unauthorized/未授权访问; api-client converts that to Error; /tasks catch renders it instead of redirecting.
next_action: Read API tasks route, api-client, root page, and app layout.

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: Unauthenticated visit to /tasks should redirect back to intended entry/login/home screen; login/register UI should match Pencil design with blue brand panel left, white form panel right, compact centered auth card.
actual: /tasks unauthenticated stays on page with nav/header and red Unauthorized/未授权访问 panel; login/register UI does not match Pencil design.
errors: Unauthorized/未授权访问 panel.
reproduction: Visit /tasks while not logged in; view login/register pages.
started: Not specified.

## Eliminated
<!-- APPEND only - prevents re-investigating -->


## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-06-09T00:00:00Z
  checked: Knowledge base
  found: No .planning/debug/knowledge-base.md exists.
  implication: No known-pattern hypothesis available; proceed with direct code inspection.
- timestamp: 2026-06-09T00:00:00Z
  checked: File discovery for middleware/auth/tasks
  found: Found src/app/tasks/page.tsx, src/app/auth/login/page.tsx, src/app/auth/register/page.tsx, src/lib/auth.ts, src/providers/auth-provider.tsx, and no middleware.ts under src from initial search.
  implication: Route protection likely implemented at page/component level rather than middleware redirect.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Confirmed. /tasks is a client-only page with no session guard or middleware protection. It renders its full navigation/header immediately, calls apiGet('/api/tasks?...') in useEffect, receives the API's 401 JSON { error: '未授权访问' }, api-client throws ApiError with that message, and TasksPage catch stores it in error state and renders the red destructive error panel. Auth UI mismatch is caused by login/register pages being implemented as generic centered shadcn Cards on bg-brand-gradient-light, not the Pencil two-panel blue-left/white-right compact auth card.
fix: Do not edit in this diagnose-only run. Smallest safe fix direction: add a /tasks page-level auth guard mirroring settings page behavior, or a shared protected-route component for protected client pages, redirecting unauthenticated users to /auth/login with callbackUrl=/tasks before fetching tasks; update login/register layouts to shared two-panel auth shell matching Pencil while preserving existing form submit logic.
verification: Read-only diagnosis verified by code inspection of /tasks page, API tasks route, api-client, auth pages, settings guard, root layout, and file search showing no middleware.
files_changed: []
