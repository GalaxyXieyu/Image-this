# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Imagine This** is a desktop-first full-stack AI product visual workbench built with Next.js 15 (App Router), React 19, Prisma/SQLite, and Electron. The product direction has evolved from a generic AI image toolbox into an e-commerce visual production platform: users upload product assets, generate scene/listing visuals, run background/outpaint/upscale/watermark/video tasks, and manage async results through a local task queue.

Current active product surfaces:
- `/` - product landing and entry navigation
- `/workspace/scene` - main scene image generation workflow
- `/combo` - configurable multi-step workflow builder
- `/tools` - AI image utility toolbox
- `/tasks` - task center and progress visibility
- `/results` - generated asset management
- `/templates` - prompt/template library
- `/settings` - provider credentials and runtime settings

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 34123
npm run electron:dev     # Start Electron dev mode (web + desktop)

# Build
npm run build            # Build Next.js for production
npm run build:windows    # Package Windows desktop app
npm run build:mac        # Package macOS desktop app

# Database
npx prisma studio        # Open Prisma Studio GUI
npx prisma db push       # Push schema changes to database
npx prisma generate      # Regenerate Prisma Client

# Utilities
npm run lint             # Run ESLint
npm run clean            # Clean build caches
npm run screenshots:readme  # Generate README screenshots with Playwright

# UI/UX test pipeline
npm run test:uiux        # Run login → scene image generation flow and write CSV/screenshots/report
npm run test:uiux:login-generate  # Same as test:uiux, explicit flow name
npm run test:uiux:record:opencli  # Exploratory opencli record probe; saves candidates under out/ui-ux-plan/<run-id>/opencli
npm run test:uiux:codegen  # Manually record an editable Playwright script + HAR/storage under out/ui-ux-plan/<run-id>/recordings
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Prisma ORM, SQLite
- **State**: Zustand for client state management
- **Desktop**: Electron 39.x with electron-builder
- **Auth**: NextAuth.js with credentials provider

### Key Directories

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/
│   │   ├── auth/           # NextAuth and registration
│   │   ├── images-process/ # Core image processing endpoints
│   │   ├── tasks/          # Task queue management (status, recent, retry, recover, worker)
│   │   ├── volcengine/     # Volcengine AI service
│   │   ├── jimeng/         # Jimeng AI image generation
│   │   ├── jimeng-video/   # Jimeng image-to-video generation
│   │   ├── quality-review/ # AI quality review
│   │   ├── input-assets/   # Uploaded/reference asset registration
│   │   ├── models/         # Available AI models listing
│   │   └── files/          # Local file serving
│   ├── workspace/scene/    # Main product scene generation workflow
│   ├── combo/              # Multi-step workflow builder
│   ├── tools/              # AI utility toolbox
│   ├── tasks/              # Task center
│   ├── results/            # Generated result management
│   ├── templates/          # Prompt/template library
│   └── settings/           # Provider/runtime settings
├── lib/
│   └── image-processor/    # AI provider abstraction layer
│       ├── providers/      # Gemini, GPT, Qwen, Jimeng, Volcengine
│       ├── factory.ts      # Provider factory pattern
│       ├── service.ts      # Unified processing service
│       ├── types.ts        # Shared types and interfaces
│       └── utils/          # API client, image converter, signatures, provider helpers
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── workbench/          # New product workbench components
│   └── workspace/          # Existing/legacy workspace components
├── features/               # Feature-level workspace hooks/libs
├── hooks/                  # Reusable React hooks and task polling
├── stores/                 # Zustand stores
└── types/                  # Shared TypeScript declarations

electron/                   # Electron main process, database preparation, updates
prisma/
└── schema.prisma           # Database schema (SQLite)
.planning/codebase/         # Current codebase map and risk documents
```

### Image Processing Architecture

The system uses a **factory pattern** for AI providers:

1. `ImageProcessorFactory` initializes providers based on user config
2. Providers implement `IImageProcessor` interface with methods: `enhance`, `outpaint`, `backgroundReplace`, `generate`
3. Available providers: `volcengine`, `gpt`, `gemini`, `qwen`, `jimeng`

### Task Queue System

Async processing via `TaskQueue` model:
- Tasks have states: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`
- Progress tracking with `currentStep`, `totalSteps`, `completedSteps`
- Built-in retry mechanism with `retryCount` and `maxRetries`

### Active Product Architecture

The current product should be treated as an **e-commerce AI visual production workbench**, not only a generic image-processing tab UI.

Primary workflow:
1. User uploads or references product assets
2. User chooses a scene/template/workflow
3. Frontend creates one or more `TaskQueue` records
4. Worker processes tasks through the configured AI provider or local image pipeline
5. Results are persisted as files and database records
6. UI shows progress through task polling and result management pages

Current route priorities:
- Main product creation: `/workspace/scene`
- Multi-step workflow composition: `/combo`
- Utility functions: `/tools`
- Progress visibility: `/tasks`
- Output management: `/results`

### Development Requirements

When making changes in this repository:
- Keep using Next.js App Router conventions.
- Prefer Server Components unless the UI needs browser state, upload, drag/drop, polling, canvas, or direct interaction.
- Keep API routes as the boundary for Prisma, filesystem, provider credentials, and external AI calls.
- Keep provider-specific behavior inside `src/lib/image-processor/providers/` or the unified image processor service.
- Do not put secrets, API keys, tokens, or full base64 payloads in logs.
- Avoid storing large image/video/base64 payloads in `TaskQueue.inputData` or `TaskQueue.outputData`; prefer asset references, file paths, and result records.
- When adding task types, update frontend creation, worker dispatch, database comments/docs, and status/result rendering together.
- Treat `/api/tasks/status` as the preferred lightweight polling path where possible.
- Desktop behavior matters: changes must consider Electron startup, local SQLite, local file URLs, and packaged runtime paths.
- If editing current product flow, check `.planning/codebase/` first for the latest architecture map and known concerns.

### Known Architecture Risks To Respect

- Worker lifecycle currently depends on `/api/tasks/worker` being triggered; it is not a true always-on background worker.
- `src/app/api/tasks/worker/route.ts` is high-risk because it mixes scheduling, execution, provider dispatch, persistence, and retry logic.
- Task type names can drift between frontend pages and worker dispatch. Keep them centralized or manually synchronized.
- Large task payloads can slow SQLite and task polling, especially in Windows desktop builds.
- The product has both older image-toolbox surfaces and newer e-commerce visual workbench surfaces. Prefer the newer workbench direction unless explicitly maintaining legacy behavior.

## Database

SQLite with Prisma ORM. Key models:
- `User`: Auth + API credentials storage (Volcengine, GPT, Gemini, Jimeng/Qwen keys, Superbed token, local storage path)
- `TaskQueue`: Async task management with priority, progress, retry
- `ProcessedImage`: Processing results with quality score and review
- `PromptTemplate`: User-defined + system prompt templates by category
- `Project`: Image/task grouping per user

Default database: `prisma/app.db` (template included in repo)

## Environment Variables

Required in `.env`:
- `DATABASE_URL`: SQLite path (default: `file:./app.db`)
- `NEXTAUTH_SECRET`: Auth secret
- AI provider keys are stored per-user in database, not in env

## Test Account

For local development and UI testing:

| Field | Value |
|---|---|
| Email | `test@imaginethis.local` |
| Password | `TestPassword123!` |
| Name | Test User |

Register at `/auth/register` or use the API directly:
```bash
curl -X POST http://localhost:34123/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@imaginethis.local","password":"TestPassword123!"}'
```

## UI/UX Test Workflow

The reusable UI/UX test layer is split into two paths:

1. **Record/explore first** when a flow is new or unstable:
   - `npm run test:uiux:codegen` opens Playwright codegen and writes an editable script, HAR, storage state, and manifest under `out/ui-ux-plan/<run-id>/recordings/`.
   - `npm run test:uiux:record:opencli` records API/network candidates from a live browser session.
   - Clean up the recorded script by removing mistaken clicks, repeated waits, transient toast selectors, and unrelated navigation before moving stable steps into the replay path.
2. **Replay/report after the flow is stable**:
   - `npm run test:uiux` runs the login → workspace scene → upload assets → submit image generation task flow.
   - Artifacts are written under `out/ui-ux-plan/<run-id>/`: CSV tables, screenshots, trace, network log, recordings/opencli probe assets, and Markdown report.

Important boundaries:
- `opencli` is an exploratory recorder. It does not directly replace the stable replay/report path.
- Playwright codegen is the preferred way to export a reusable script after manually walking a flow.
- Generated codegen scripts are source material: remove noisy operations first, then promote stable steps into `scripts/uiux/login-generate-image.mjs` or a maintained `tests/e2e/uiux/` script.
- `chrome-mcp` exploration findings should enter the same CSV/report contract through case result, failure type, evidence path, screenshot path, and notes.
- Actual image generation can be `BLOCKED/ENV` if local provider credentials are missing; the UI/task creation flow should still be recorded.
- The local `ui-ux-test` skill is available at `/Users/galaxyxieyu/.claude/skills/ui-ux-test` and owns CSV/report conventions.

## Ports

- Development: `34123`
- Production: `34123`
