# Quality Map for PM-First Initialization

**Analysis Date:** 2026-06-10
**Scope:** Style conventions, tests, lint/build verification, documentation, and development workflow for `/Volumes/DATABASE/code/business/Image-this`.

## PM Workflow Contract

**Source of truth:**
- Start tracked implementation from PM context, not ad-hoc edits. `AGENTS.md` defines `/Volumes/DATABASE/code/business/Image-this` as the repo root and PM binding point.
- Read PM state before tracked implementation work: `/Volumes/DATABASE/code/business/Image-this/pm.json`, `/Volumes/DATABASE/code/business/Image-this/.pm/current-context.json`, `/Volumes/DATABASE/code/business/Image-this/.pm/bootstrap.json`, and `/Volumes/DATABASE/code/business/Image-this/.pm/coder-context.json`.
- Keep local backend mode offline and do not invoke `lark-cli` from local backend work. `AGENTS.md` reserves Feishu delivery for the official `lark-cli` path.
- Use `product-canvas` to clarify ambiguous product, UX, and acceptance questions before implementation; use `project-review` as the post-implementation quality layer.

## Style Conventions

**TypeScript and React:**
- Use TypeScript with strict checking. `tsconfig.json` enables `strict`, `noEmit`, `isolatedModules`, and the `@/*` path alias to `src/*`.
- Prefer App Router conventions. Route handlers live under `src/app/api/**/route.ts`; pages live under `src/app/**/page.tsx`.
- Add `"use client"` only for interactive browser state, effects, polling, uploads, navigation hooks, canvas, or UI events. Example: `src/app/workspace/scene/page.tsx` uses client state, uploads, polling, and toasts.
- Use named TypeScript interfaces/types near their owning module when local to a page or hook. Examples: `SceneCandidateResult` and `WorkflowData` in `src/app/workspace/scene/page.tsx`; `UseWorkflowTaskPollingOptions` in `src/hooks/workbench/useWorkflowTaskPolling.ts`.

**Imports and aliases:**
- Import external packages first, then local `@/*` modules, then local types. Examples: `src/app/workspace/scene/page.tsx`, `src/app/api/tasks/status/route.ts`, and `src/lib/workbench/api-contract.ts`.
- Use `@/` imports for source files instead of long relative paths. Examples: `@/lib/prisma` in `src/app/api/tasks/status/route.ts` and `@/types/workbench` in `src/lib/workbench/api-contract.ts`.

**UI components:**
- Use shadcn/Radix primitives and Tailwind utility classes. `src/components/ui/button.tsx` uses `@radix-ui/react-slot`, `class-variance-authority`, and `cn` from `src/lib/utils.ts`.
- Prefer variant-driven component styling for reusable UI. Add button variants through `buttonVariants` in `src/components/ui/button.tsx` rather than duplicating button class strings.
- Keep product-workbench components under `src/components/workbench/`; keep generic UI atoms under `src/components/ui/`; keep route-specific page logic in `src/app/**/page.tsx`.

**API and backend patterns:**
- Keep Prisma, filesystem, credentials, and provider calls behind API routes or server-only libraries. Examples: `src/app/api/tasks/status/route.ts`, `src/app/api/tasks/worker/route.ts`, and `src/lib/image-processor/**`.
- Check session ownership on user-scoped API routes with `getServerSession(authOptions)`. `src/app/api/tasks/status/route.ts` returns `401` when `session.user.id` is missing and scopes task queries by `userId`.
- Return JSON with `NextResponse.json`; use Chinese user-facing error text where the surrounding route uses Chinese messages. Example: `src/app/api/tasks/status/route.ts`.
- Avoid persisting large base64/image payloads in task output. `src/app/api/tasks/worker/route.ts` whitelists result fields and drops long strings suspected to be base64.

**Validation and contracts:**
- Keep reusable workflow contracts in `src/lib/workbench/api-contract.ts` and shared types in `src/types/workbench/**`.
- Validate parsed task input with explicit narrowing helpers. `src/lib/workbench/input-validation.ts` throws descriptive errors and returns defaulted typed params for background replace, watermark, upscale, outpaint, one-click, and video tasks.
- Keep task type compatibility centralized. `src/lib/workbench/api-contract.ts` adapts workflow requests to legacy `TaskQueue.type` values through `WORKFLOW_TO_LEGACY_TYPE` and `buildLegacyInputData`.

**Logging and comments:**
- Keep logs focused on operational failures or key smoke-test phases. Examples: `src/hooks/workbench/useWorkflowTaskPolling.ts` warns on polling errors; `scripts/smoke-tool-tasks.mjs` uses `=== Smoke test for toolbox tasks ===` for a clear phase marker.
- Do not log secrets, API keys, tokens, full `.env` values, or full base64 payloads. `scripts/uiux/login-generate-image.mjs` records provider env key names and status only, not values.
- Use comments for architecture boundaries and non-obvious operational constraints. Examples: `src/lib/workbench/api-contract.ts` documents compatibility adapters; `src/app/api/tasks/worker/route.ts` documents dynamic route/runtime behavior.

## Lint and Formatting

**Configured linting:**
- Run `npm run lint` for ESLint. `package.json` maps it to `eslint . --config config/eslint.config.mjs`.
- ESLint uses flat config in `config/eslint.config.mjs` and extends `next/core-web-vitals`.
- Ignored lint paths are `.next/**`, `node_modules/**`, `out/**`, `build/**`, `dist/**`, `dist-electron/**`, `coverage/**`, `test-results/**`, and `playwright-report/**`.
- Current explicit rules are warnings for unused variables, React hook dependencies, and image alt text: `no-unused-vars`, `react-hooks/exhaustive-deps`, and `jsx-a11y/alt-text` in `config/eslint.config.mjs`.

**Formatting:**
- No Prettier, Biome, or dedicated format script is detected in `package.json` or root config files.
- Match surrounding file style when editing: many `src/app/**` and `src/lib/**` files use single quotes and semicolons; some shadcn UI files such as `src/components/ui/button.tsx` use double quotes and omit semicolons.
- Do not introduce broad formatting-only diffs; keep changes surgical and consistent with the touched file.

## Test and Verification Patterns

**Automated UI/UX replay:**
- Primary maintained UI/UX replay command is `npm run test:uiux`, mapped to `node scripts/uiux/login-generate-image.mjs` in `package.json`.
- The replay flow starts or reuses the dev server, logs in with the local test account, uploads product/reference assets, submits scene generation, polls task status, and writes artifacts under `out/ui-ux-plan/<run-id>/`.
- Artifacts include CSV rows, screenshots, traces, network logs, and Markdown report conventions in `scripts/uiux/login-generate-image.mjs`.
- Provider-backed image generation can be environment-blocked when credentials are missing. Use `UIUX_REQUIRE_IMAGE=true` only when actual generation output is required.

**Exploratory UI recording:**
- Use `npm run test:uiux:codegen` for new or unstable flows. `scripts/uiux/codegen-login-generate.mjs` opens Playwright codegen and writes a HAR, storage state, generated script, and `recording-manifest.json` under `out/ui-ux-plan/<run-id>/recordings/`.
- Clean recorded scripts before promoting them: remove mistaken clicks, repeated waits, transient toast selectors, and unrelated navigation. This cleanup workflow is encoded in `scripts/uiux/codegen-login-generate.mjs`.
- Use `npm run test:uiux:record:opencli` or `npm run test:uiux:probe:opencli` for exploratory network/API candidate capture through `scripts/uiux/opencli-probe.mjs`.

**Smoke/manual tests:**
- `scripts/smoke-tool-tasks.mjs` is a toolbox smoke script requiring a running dev server, valid session cookies in `/tmp/smoke_cookies.txt`, and configured provider credentials. It creates tasks, triggers `/api/tasks/worker`, and polls `/api/tasks/status`.
- `scripts/test-video-api.ts` and `scripts/manual-test-volcengine-enhance.mjs` are manual/provider verification scripts, not package-level test commands.
- No Jest, Vitest, or conventional `*.test.*` / `*.spec.*` test suite is detected. Do not assume unit coverage exists for new logic.

**Build verification:**
- Run `npm run build` for the Next.js production build. `scripts/run-next-build.mjs` invokes `next build` and then `scripts/post-build.js`.
- Run `npm run build:windows` or `npm run build:mac` for desktop packaging. `package.json` routes these through `scripts/build-windows.mjs` and `scripts/build-mac.mjs` after `npm run clean`.
- Use `scripts/verify-build.js` to inspect Windows packaged output under `dist-electron/win-unpacked`; it checks the Electron executable, `.next/standalone`, static assets, Prisma Windows engine, public assets, and production env file presence.
- Development server port is `34123`; use `npm run dev` for web and `npm run electron:dev` for desktop web+Electron validation.

## Documentation Practices

**Stable project docs:**
- `CLAUDE.md` contains stable architecture, commands, route priorities, database notes, environment requirements, and quality risks for coding agents.
- `README.md` is product-facing and documents routes, feature areas, stack, quick start, desktop development, and external AI service setup.
- `docs/desktop-operations.md` documents release, Windows signing, update delivery, and SQLite repair operations.
- `docs/brand-ui-spec.md` documents product UI/brand guidance; `.pen` design files such as `docs/image-this.pen` must be accessed only through Pencil tooling, not direct file reads.

**Planning docs:**
- Keep generated codebase maps in `.planning/codebase/` concise, current-state, and evidence-based.
- Include actionable file paths in planning docs so implementation agents can navigate directly to source files.
- Do not include secret values, API keys, tokens, or `.env` contents in generated docs.

## Development Workflow Recommendations

**Before implementation:**
- Normalize tracked behavior changes through PM context as required by `AGENTS.md`.
- Check `.planning/codebase/` and `CLAUDE.md` before changing active product flows, especially task queue, worker dispatch, provider integrations, and Electron packaging.
- Clarify ambiguous UX/product requirements before coding; do not create temporary tests or scripts without confirming approach when requirements are unclear.

**During implementation:**
- Keep API routes as the boundary for Prisma, filesystem, credentials, and external AI calls.
- Prefer Server Components unless browser state, uploads, drag/drop, polling, canvas, navigation hooks, or direct interaction require Client Components.
- When adding task types, update frontend creation, worker dispatch, database comments/docs, task polling/status rendering, and result rendering together.
- Keep task payloads lightweight: store asset references, file paths, result IDs, and result URLs rather than image/video/base64 payloads.

**Before handoff:**
- Run the smallest relevant verification first, then broaden as needed: `npm run lint`, targeted smoke/UIUX script, `npm run build`, and desktop packaging only when affected.
- For UI/UX changes, record or replay the relevant flow and preserve artifacts under `out/ui-ux-plan/<run-id>/`.
- For desktop/runtime changes, validate both web behavior and Electron packaged path assumptions, including SQLite location and local file URL handling.
- Remove temporary scripts, debug logs, and redundant code before marking work complete.

---

*Quality analysis: 2026-06-10*
