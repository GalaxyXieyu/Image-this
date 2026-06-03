# External Integrations

**Analysis Date:** 2026-06-03

## AI Providers

**Gemini**
- Purpose：背景替换、图像理解、质量审核等。
- Integration：`src/lib/image-processor/providers/gemini.ts`、`src/lib/image-processor/service.ts`、`src/app/api/quality-review/route.ts`。
- Credentials：`geminiApiKey`、`geminiBaseUrl`、`geminiModelName`，按用户存储。

**GPT / GPT-4o Compatible API**
- Purpose：背景替换、图像理解等。
- Integration：`src/lib/image-processor/providers/gpt.ts`。
- Credentials：`gptApiUrl`、`gptApiKey`、`gptModelName`，按用户存储。

**Qwen**
- Purpose：背景替换/扩图相关备选能力。
- Integration：`src/lib/image-processor/providers/qwen.ts`、`src/app/api/qwen/route.ts`。
- Credentials：当前复用 GPT API Key 相关配置。

**Volcengine**
- Purpose：智能扩图、画质增强、部分视觉能力。
- Integration：`src/lib/image-processor/providers/volcengine.ts`、`src/app/api/volcengine/**/route.ts`、Volcengine 签名工具。
- Credentials：`volcengineAccessKey`、`volcengineSecretKey`，按用户存储。

**Jimeng / Ark**
- Purpose：背景替换、图生视频。
- Integration：`src/lib/image-processor/providers/jimeng.ts`、`src/app/api/jimeng/**/route.ts`、`src/app/api/jimeng-video/**/route.ts`。
- Credentials：`arkApiKey` 或 Legacy AccessKey/SecretKey，按用户存储。
- Note：Legacy 链路可能依赖图床配置。

## File/Image Hosting

**Local Storage**
- Purpose：默认保存上传素材、处理结果、视频文件。
- Implementation：`src/lib/local-storage.ts`、`src/lib/storage.ts`、`src/app/api/files/[...path]/route.ts`。
- Access：Electron/本地环境下通过本地路径和文件 API 转换为前端可访问 URL。

**Superbed**
- Purpose：外部图床，用于部分 provider 需要公网图片 URL 的场景。
- Implementation：`src/lib/superbed-upload.ts`。
- Credentials：`superbedToken`，按用户存储。

**MinIO**
- Purpose：依赖已存在，当前文档和代码定位为可选存储能力。
- Risk：不是当前主链路，使用前需要确认配置与调用路径。

## Database

**SQLite**
- Purpose：主业务数据库，尤其适合桌面端本地运行。
- ORM：Prisma。
- Schema：`prisma/schema.prisma`。
- Runtime：Electron 启动阶段负责准备/修复桌面数据库。

**Prisma Client**
- Purpose：API routes、worker、配置读取、任务状态写入。
- Packaging：桌面构建需要确保 Prisma runtime 和 binary target 可用。

## Authentication & Identity

**NextAuth**
- Purpose：登录、注册、session、API 鉴权边界。
- Implementation：`src/lib/auth.ts`、`src/app/api/auth/**`。
- Strategy：JWT session strategy。

**Credentials Login**
- Purpose：本地/桌面优先的邮箱密码登录。
- Storage：密码 hash 存在用户表。

**OAuth**
- Google / GitHub OAuth 变量存在于文档与环境配置范畴。
- 当前核心业务不依赖 OAuth 作为唯一登录方式。

## Desktop Updates

**GitHub Release / Update Metadata**
- Purpose：Windows 桌面自动更新元信息和安装包资源访问。
- Implementation：`src/lib/github-release-broker.ts`、`src/lib/desktop-updates.ts`、`src/app/api/desktop-updates/windows/**`、`electron/update-manager.js`。
- Runtime：Electron updater 消费更新配置。

## Deployment/Infrastructure

**Nginx**
- Files：`nginx/**`。
- Role：Web/服务端部署辅助配置，当前 CI 主链路为 standalone + PM2。

**Redis**
- File：`redis/redis.conf`。
- Role：配置存在，但当前任务队列主链路仍是 SQLite，不是 Redis 队列。

## Observability

**Electron Logs**
- Purpose：主进程、Next 子进程、启动失败排障。
- Location：桌面用户数据/日志目录。
- Implementation：`electron/main.js`。

**API Logs**
- Purpose：任务、provider、配置、错误排障。
- Current Pattern：大量 `console.log` / `console.error`。

**External Monitoring**
- 当前未接入 Sentry、Datadog 等外部错误追踪平台。

## Integration Risks

- AI provider 密钥和模型配置按用户维度变化，调用失败通常需要同时检查用户配置、provider adapter 和 worker 输入。
- 桌面打包对 Prisma、sharp、Next standalone、环境变量和资源路径耦合较强。
- 部分 provider 需要可访问图片 URL，本地路径、图床 URL、base64 之间的转换是高风险边界。
- Redis、Docker、MinIO 等能力存在配置或依赖，但不是所有都处于主业务活跃路径。

---
*Update when adding/removing providers, storage targets, auth methods, or deployment paths.*