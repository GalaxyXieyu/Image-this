# External Integrations

**Analysis Date:** 2026-05-26

## APIs & External Services

**AI Image/Video Providers:**
- GPT 图像处理链路 - 背景替换等能力
  - Integration method: 通过 `src/lib/image-processor/providers/gpt.ts` 和相关 service 走 HTTP 调用
  - Auth: 用户配置中的 `gptApiUrl`、`gptApiKey`、`gptModelName`
- Gemini - 图像处理与生成
  - Integration method: `src/lib/image-processor/providers/gemini.ts`
  - Auth: `geminiApiKey`、`geminiBaseUrl`、`geminiModelName`
- 火山引擎 / 即梦 / Qwen - 图像扩图、高清化、视频生成等
  - Integration method: `src/lib/image-processor/providers/*` 与 `src/app/api/*/service.ts`
  - Auth: AccessKey/SecretKey、Ark API Key 等用户侧配置

**External APIs:**
- GitHub Release - Windows 桌面更新元信息相关逻辑
  - Integration method: `src/lib/github-release-broker.ts`
- Superbed 图床
  - Integration method: `src/lib/superbed-upload.ts`
  - Auth: `superbedToken`

## Data Storage

**Databases:**
- SQLite - 主数据存储
  - Connection: `DATABASE_URL=file:...`
  - Client: Prisma ORM
  - Migrations: `prisma/schema.prisma` + `prisma/migrations`，桌面端另有 `electron/database-manager.js` 做模板库和迁移修复

**File Storage:**
- 本地文件系统 - 图片、视频、上传结果默认走本地目录
  - Implementation: `src/lib/local-storage.ts`, `src/lib/storage.ts`
  - Access path: Web 形态使用 `/uploads/*`，Electron 形态通过 `/api/files/*`

**Caching:**
- 无显式 Redis / 内存缓存基础设施
- 当前主要依赖数据库与本地文件系统直读直写

## Authentication & Identity

**Auth Provider:**
- NextAuth + Prisma Adapter
  - Implementation: `src/lib/auth.ts`
  - Token storage: JWT session strategy
  - Session management: `getServerSession()` 在 API routes 中广泛使用

**OAuth Integrations:**
- Google OAuth
- GitHub OAuth
  - Credentials: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`

## Monitoring & Observability

**Error Tracking:**
- 无外部错误追踪平台
- 主要依赖 `console.*`、Electron 主进程日志文件和 API 路由日志

**Logs:**
- Electron 主进程把日志同步写到 `~/ImagineThis/logs`
  - Implementation: `electron/main.js`
- Next 子进程 stdout/stderr 被主进程接管并写盘

## CI/CD & Deployment

**Hosting:**
- 主要是本地桌面打包分发，不是云部署主导

**CI Pipeline:**
- 仓库内未见成熟 CI 工作流文件
- 构建依赖本地脚本：`scripts/build-windows.mjs`, `scripts/build-mac.mjs`, `scripts/verify-build.js`

## Environment Configuration

**Development:**
- 依赖 `.env.production` / 本地环境变量 / 数据库存储的用户配置
- 机密可走桌面 secret store：`src/lib/desktop-secret-store.ts`

**Production:**
- Windows 桌面包内嵌 `.env.production`
- Electron 主进程在启动时注入 `DATABASE_URL`, `NEXTAUTH_URL`, `IMAGINE_THIS_DESKTOP` 等变量

## Webhooks & Callbacks

**Incoming:**
- 当前未见典型第三方 webhook 接收链路

**Outgoing:**
- 外部 AI provider 请求
- GitHub Release / 更新元数据读取

---
*Integration audit: 2026-05-26*
*Update when adding/removing external services*
