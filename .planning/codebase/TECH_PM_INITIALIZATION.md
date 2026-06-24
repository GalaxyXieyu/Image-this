# Tech Map for PM-First Initialization

**Analysis Date:** 2026-06-10

## Runtime

**Primary runtime:**
- Node.js `>=20 <24` from `package.json` engines.
- npm is the package manager; `package-lock.json` is present and should be treated as authoritative.

**Application modes:**
- Web development runs Next.js on port `34123` via `npm run dev` in `package.json`.
- Production web serving uses `next start -p 34123` via `npm run start` in `package.json`.
- Desktop development starts Next.js plus Electron via `npm run electron:dev` in `package.json`.
- Electron main process entry is `electron/main.js`, referenced by `package.json` `main`.

**Desktop runtime notes:**
- Electron uses `electron/main.js`, `electron/preload.js`, `electron/database-manager.js`, and `electron/app-runtime.js`.
- `electron/main.js` starts/monitors the local app runtime and includes an 8-second worker scheduler trigger interval.
- Packaged builds use `electron-builder` configuration embedded in `package.json`.

## Package Scripts

**Development:**
- `npm run dev` — starts Next.js dev server on `localhost:34123`.
- `npm run electron:dev` — runs `npm run dev`, waits for `http://localhost:34123`, then starts Electron.

**Build and packaging:**
- `npm run build` — runs `scripts/run-next-build.mjs`, which invokes Next build and then `scripts/post-build.js`.
- `npm run build:mac` — runs `scripts/build-mac.mjs`, generating icons, building Next.js, and invoking `electron-builder --mac`.
- `npm run build:windows` — runs `scripts/build-windows.mjs --auto` after cleanup.
- `npm run electron:build:win` — invokes `electron-builder --win` directly.

**Maintenance:**
- `npm run lint` — runs ESLint with `config/eslint.config.mjs`.
- `npm run clean` — runs `scripts/clean-build.mjs`.
- `npm run screenshots:readme` — runs `scripts/generate-readme-screenshots.mjs`.

**UI/UX verification:**
- `npm run test:uiux` — runs `scripts/uiux/login-generate-image.mjs`.
- `npm run test:uiux:login-generate` — same replay path as `npm run test:uiux`.
- `npm run test:uiux:record:opencli` — runs exploratory recorder `scripts/uiux/opencli-probe.mjs`.
- `npm run test:uiux:codegen` — runs Playwright codegen wrapper `scripts/uiux/codegen-login-generate.mjs`.

## Frameworks

**Frontend:**
- Next.js `15.3.4` with App Router under `src/app/`.
- React `^19.0.0` and React DOM `^19.0.0`.
- TypeScript `^5` with strict mode enabled in `tsconfig.json`.
- Path alias `@/*` maps to `./src/*` in `tsconfig.json`.

**UI and styling:**
- Tailwind CSS `^3.4.10` with config at `config/tailwind.config.js`.
- PostCSS config is `postcss.config.mjs`, pointing Tailwind to `./config/tailwind.config.js`.
- Radix UI packages provide shadcn-style primitives via `@radix-ui/react-*` dependencies in `package.json`.
- Icon libraries include `lucide-react` and `@tabler/icons-react`.
- Canvas/visual editing dependencies include `konva`, `react-konva`, and `react-rnd`.

**Backend and data:**
- Next.js API routes live under `src/app/api/`.
- Prisma `^5.22.0` and `@prisma/client ^5.22.0` are used with SQLite in `prisma/schema.prisma`.
- Prisma binary targets include `native`, `windows`, and `debian-openssl-3.0.x` in `prisma/schema.prisma`.
- Auth uses NextAuth.js `^4.24.7` with Prisma adapter `@next-auth/prisma-adapter`.

**Desktop:**
- Electron `^39.2.3` and Electron Builder `^26.0.12`.
- Desktop build output goes to `dist-electron` per `package.json` build config.
- macOS targets are `dmg` and `zip`; Windows targets are `nsis` and `portable`; Linux targets are `AppImage` and `deb`.

## Important Tools and Integrations

**AI/image processing:**
- Provider factory lives in `src/lib/image-processor/factory.ts`.
- Supported provider classes are `src/lib/image-processor/providers/volcengine.ts`, `src/lib/image-processor/providers/gpt.ts`, `src/lib/image-processor/providers/gemini.ts`, `src/lib/image-processor/providers/qwen.ts`, and `src/lib/image-processor/providers/jimeng.ts`.
- Core image processing service is `src/lib/image-processor/service.ts`.
- Image utilities include `src/lib/image-processor/utils/api-client.ts`, `src/lib/image-processor/utils/image-converter.ts`, and `src/lib/image-processor/utils/volcengine-signature.ts`.
- Sharp `^0.34.5` is available for image processing.

**Task and product workflow APIs:**
- Core task routes live under `src/app/api/tasks/`.
- Worker execution entry is `src/app/api/tasks/worker/route.ts`.
- Workflow task API is `src/app/api/workflow/tasks/route.ts` with status route `src/app/api/workflow/tasks/status/route.ts`.
- Image-processing APIs include `src/app/api/images-process/background-replace/route.ts`, `src/app/api/images-process/enhance/route.ts`, `src/app/api/images-process/outpaint/route.ts`, and `src/app/api/images-process/watermark/route.ts`.

**Environment configuration:**
- `.env`, `.env.production`, and `.env.example` are present; contents were not read because environment files may contain secrets.
- Database connection is read through `DATABASE_URL` in `prisma/schema.prisma`.
- UI/UX scripts reference provider env key names in `scripts/uiux/login-generate-image.mjs` but should not print secret values.

**Build configuration:**
- `next.config.ts` uses `output: 'standalone'`, allows remote images broadly through `remotePatterns`, and marks `@prisma/client` as a server external package.
- `next.config.ts` ignores ESLint during production builds, so run `npm run lint` separately before release.
- `scripts/run-next-build.mjs` isolates Windows build home directories before invoking Next build and post-build.

**Linting:**
- ESLint `^9` uses flat config at `config/eslint.config.mjs`.
- Config extends `next/core-web-vitals` and treats unused vars, React hook exhaustive deps, and alt text as warnings.
- Ignored folders include `.next/`, `node_modules/`, `out/`, `build/`, `dist/`, `dist-electron/`, `coverage/`, `test-results/`, and `playwright-report/`.

## Verification Commands

**Fast local confidence:**
```bash
npm run lint
npm run build
```

**Desktop development smoke:**
```bash
npm run electron:dev
```

**UI/UX replay:**
```bash
npm run test:uiux
```

**Database checks and client generation:**
```bash
npx prisma generate
npx prisma db push
npx prisma studio
```

**Release packaging:**
```bash
npm run build:mac
npm run build:windows
```

## PM Notes

**What this stack optimizes for:**
- Desktop-first local AI production workflows using Electron plus a local Next.js runtime.
- E-commerce visual generation surfaces backed by API routes, Prisma/SQLite, filesystem assets, and provider-specific AI integrations.
- Async work visibility through task queue APIs and UI/UX replay scripts.

**Release readiness gates:**
- Run `npm run lint` because `next.config.ts` skips ESLint during `npm run build`.
- Run `npm run build` before Electron packaging because desktop packages depend on Next standalone output.
- Run `npm run test:uiux` for the login-to-generation workflow; provider credential gaps may block actual image generation but still validate navigation and task creation.
- Validate packaged desktop behavior on target OS because Electron, local SQLite, Sharp binaries, and Prisma binary targets are platform-sensitive.

---

*Tech map: 2026-06-10*
