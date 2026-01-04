# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Imagine This** is a full-stack AI image processing platform built with Next.js 15 (App Router), supporting both web and desktop (Electron) deployments. It integrates multiple AI providers (Gemini, GPT-4 Vision, Volcengine/Jimeng) for image processing tasks.

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 23000
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
│   │   ├── images-process/ # Core image processing endpoints
│   │   ├── tasks/          # Task queue management
│   │   ├── volcengine/     # Volcengine AI service
│   │   └── jimeng/         # Jimeng AI service
│   └── workspace/          # Main workspace UI
├── lib/
│   └── image-processor/    # AI provider abstraction layer
│       ├── providers/      # Gemini, GPT, Qwen, Jimeng implementations
│       ├── factory.ts      # Provider factory pattern
│       └── types.ts        # Shared types and interfaces
├── stores/                 # Zustand stores
│   └── useWorkspaceTabStore.ts  # Workspace tab state management
└── components/
    ├── ui/                 # shadcn/ui components
    └── workspace/          # Workspace-specific components

electron/                   # Electron main process
prisma/
└── schema.prisma          # Database schema (SQLite)
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

### Workspace Tabs

Five processing modes managed by `useWorkspaceTabStore`:
- `one-click`: Combined workflow (background + outpaint + enhance + watermark)
- `background`: Background replacement
- `expansion`: Image outpainting
- `upscaling`: Image enhancement/upscaling
- `watermark`: Watermark overlay

## Database

SQLite with Prisma ORM. Key models:
- `User`: Auth + API credentials storage (Volcengine, GPT, Gemini keys)
- `TaskQueue`: Async task management
- `ProcessedImage`: Processing results
- `PromptTemplate`: User-defined prompt templates

Default database: `prisma/app.db` (template included in repo)

## Environment Variables

Required in `.env`:
- `DATABASE_URL`: SQLite path (default: `file:./app.db`)
- `NEXTAUTH_SECRET`: Auth secret
- AI provider keys are stored per-user in database, not in env

## Ports

- Development: `23000`
- Production: `34000`
