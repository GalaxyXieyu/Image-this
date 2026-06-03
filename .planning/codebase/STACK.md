# Technology Stack

**Analysis Date:** 2026-06-03

## Languages

**Primary:**
- TypeScript：Next.js 页面、API routes、React 组件、业务模块、部分脚本。

**Secondary:**
- JavaScript / CommonJS：Electron 主进程、打包后处理、图标生成等脚本。
- PowerShell / Shell / Batch：Windows 发布、跨平台清理和部署脚本。

## Runtime

**Environment:**
- Node.js：`>=20 <24`。
- Web 开发服务：Next.js 运行在 `34123` 端口。
- 桌面端：Electron 启动本地 Next standalone 服务，再加载本地页面。

**Package Manager:**
- npm。
- Lockfile：`package-lock.json`。

## Frameworks

**Core:**
- Next.js `15.3.4`：App Router、API Routes、standalone 输出。
- React `19`：页面和客户端交互。
- Electron `39.x`：桌面壳、窗口管理、自动更新、本地服务启动。
- Prisma `5.22`：SQLite 数据层。

**UI:**
- Tailwind CSS 3.x。
- shadcn/ui + Radix UI。
- lucide-react / Tabler Icons。
- Motion。
- React Konva / Konva：水印画布类交互。

**State/Form:**
- Zustand：工作区状态。
- React Hook Form + Zod：表单与校验。

**Testing/Verification:**
- Playwright 已安装，主要用于截图和潜在 E2E。
- 当前没有完整测试目录，验证更多依赖 lint、构建脚本和人工 smoke。

## Key Dependencies

**Business Critical:**
- `@prisma/client`：用户、任务、图片、模板、项目数据。
- `next-auth`：登录、会话、API 鉴权边界。
- `sharp`：图片处理和桌面打包原生依赖。
- `electron-updater`：桌面端自动更新。
- `axios` / `node-fetch` / `fetch`：外部 AI 与图床调用。

**Platform Critical:**
- `electron-builder`：Windows/macOS/Linux 打包。
- `concurrently`、`wait-on`：桌面开发联动启动。
- `dotenv`：构建和运行时环境变量。

## Configuration

**Environment:**
- `.env.example` / `.env.production.example` 提供环境模板。
- 桌面端由 Electron 注入 `DATABASE_URL`、`NEXTAUTH_URL`、`IMAGINE_THIS_DESKTOP` 等运行时变量。
- AI provider 凭据以用户维度存储在数据库中。

**Build:**
- `next.config.ts`：standalone 输出、远程图片规则、server external packages。
- `package.json` 的 `build` 段：Electron 产物、平台目标、文件打包规则。
- `scripts/build-windows.mjs` / `scripts/build-mac.mjs`：桌面平台构建入口。
- `scripts/run-next-build.mjs`：Next 构建入口包装。

## Common Commands

```bash
npm run dev
npm run electron:dev
npm run build
npm run build:windows
npm run build:mac
npm run lint
npx prisma db push
npx prisma generate
```

## Platform Profile

**Development:**
- Web 和 Electron 都围绕本地 `34123` 服务运行。
- SQLite 默认适合单机、桌面、本地轻量使用。

**Production:**
- 重点交付形态是 Electron 桌面端。
- Web 部署能力存在，但当前架构和文档重心偏桌面运行时。

---
*Update when major dependencies, runtime, or build targets change.*