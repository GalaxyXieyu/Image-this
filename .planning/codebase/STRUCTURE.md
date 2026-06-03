# Codebase Structure

**Analysis Date:** 2026-06-03

## Directory Layout

```text
Image-this/
├── .github/workflows/          # Docker / Windows 构建工作流
├── .planning/                  # 项目映射、阶段计划、验证记录
├── docs/                       # 产品、设计、数据库修复、部署和截图文档
├── electron/                   # Electron 主进程、数据库、预加载、自动更新
├── nginx/                      # 生产反代配置
├── prisma/                     # Prisma schema、迁移锁、SQLite 模板库
├── public/                     # 静态图标和资源
├── redis/                      # Redis 配置，占位/部署相关
├── scripts/                    # 构建、打包、验证、部署、截图脚本
├── src/
│   ├── app/                    # Next.js App Router 页面与 API routes
│   ├── components/             # UI、导航、工作区、模板、设置等组件
│   ├── features/               # 特性级 hooks/lib，目前集中在 workspace
│   ├── hooks/                  # 通用前端 hooks 和任务轮询 hooks
│   ├── lib/                    # 核心业务、存储、auth、provider、桌面辅助
│   ├── providers/              # React provider
│   ├── stores/                 # Zustand store
│   └── types/                  # 全局类型
├── next.config.ts              # Next.js 配置
├── package.json                # npm scripts、依赖、Electron build 配置
└── README.md                   # 项目说明
```

## App Routes

**Primary Pages:**
- `/`：首页，产品入口和功能导航。
- `/workspace/scene`：场景图生成工作区。
- `/combo`：组合式工作流页面。
- `/tools`：智能工具箱。
- `/templates`：模板库。
- `/tasks`：任务中心。
- `/results`：结果管理。
- `/settings`：用户设置。
- `/auth/login`、`/auth/register`：认证页面。

**Global Layout:**
- `src/app/layout.tsx`：全局字体、Auth provider、桌面更新 provider、悬浮任务按钮、toast。

## API Route Groups

**Auth:**
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/api/auth/register/route.ts`

**Task Queue:**
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/api/tasks/worker/route.ts`
- `src/app/api/tasks/status/route.ts`
- `src/app/api/tasks/recent/route.ts`
- `src/app/api/tasks/retry/route.ts`
- `src/app/api/tasks/recover/route.ts`
- `src/app/api/tasks/cron/route.ts`

**Image Processing:**
- `src/app/api/images-process/background-replace/route.ts`
- `src/app/api/images-process/enhance/route.ts`
- `src/app/api/images-process/outpaint/route.ts`
- `src/app/api/images-process/watermark/route.ts`
- `src/app/api/images-process/workflow/one-click/route.ts`
- `src/app/api/watermark/route.ts`

**Providers:**
- `src/app/api/volcengine/**/route.ts`
- `src/app/api/jimeng/**/route.ts`
- `src/app/api/jimeng-video/**/route.ts`
- `src/app/api/qwen/route.ts`
- `src/app/api/models/route.ts`

**Data Management:**
- `src/app/api/images/**/route.ts`
- `src/app/api/projects/**/route.ts`
- `src/app/api/prompt-templates/**/route.ts`
- `src/app/api/input-assets/route.ts`
- `src/app/api/settings/route.ts`
- `src/app/api/files/[...path]/route.ts`

**Desktop/Infra:**
- `src/app/api/health/route.ts`
- `src/app/api/desktop-updates/windows/**/route.ts`

## Core Module Locations

**Image Processor:**
- `src/lib/image-processor/factory.ts`：provider 注册和获取。
- `src/lib/image-processor/service.ts`：统一图像处理服务。
- `src/lib/image-processor/providers/*.ts`：Gemini、GPT、Qwen、Jimeng、Volcengine adapter。
- `src/lib/image-processor/types.ts`：共享类型。
- `src/lib/image-processor/utils/*`：签名、图片转换、API client、锁等工具。

**Storage:**
- `src/lib/storage.ts`：存储入口。
- `src/lib/local-storage.ts`：本地文件存储。
- `src/lib/superbed-upload.ts`：Superbed 图床。
- `src/lib/image-url.ts`：前端 URL 标准化。

**Auth/Config:**
- `src/lib/auth.ts`：NextAuth 配置。
- `src/lib/user-config.ts`：用户 provider 和运行时配置读取。
- `src/lib/config-helper.ts`：配置辅助。
- `src/lib/desktop-secret-store.ts`：桌面端 secret store。

**Workbench/UI:**
- `src/components/workbench/*`：工作台类组件。
- `src/components/workspace/*`：旧/通用工作区组件。
- `src/features/workspace/*`：工作区特性抽象。
- `src/stores/useWorkspaceTabStore.ts`：工作区标签状态。

## Database Models

Located in `prisma/schema.prisma`:
- `User`：用户、认证信息、provider 凭据、图床配置、任务并发配置。
- `TaskQueue`：异步任务、状态、进度、重试、输入输出。
- `ProcessedImage`：图片处理结果和质量审核。
- `PromptTemplate`：提示词模板。
- `Project`：项目分组。
- NextAuth 标准模型：`Account`、`Session`、`VerificationToken`。

## Documentation Locations

**Product/Design:**
- `docs/ai-studio-2-prd.md`
- `docs/ai-studio-design.md`
- `docs/nextjs-guide.md`

**Operations:**
- `DEPLOYMENT.md`
- `DEPLOYMENT_NOTES.md`
- `docs/DATABASE-REPAIR.md`
- `docs/windows-code-signing.md`

**Planning:**
- `.planning/codebase/*.md`
- `.planning/phases/**`
- `.planning/PROJECT.md`

## Where to Add New Code

**New Product Page:**
- `src/app/<route>/page.tsx`
- shared UI in `src/components/<domain>/`

**New API:**
- `src/app/api/<domain>/route.ts`
- shared logic in `src/lib/` or `src/app/api/<domain>/service.ts`

**New AI Provider Capability:**
- provider adapter in `src/lib/image-processor/providers/`
- shared service in `src/lib/image-processor/service.ts`
- route or worker dispatch entry depending on whether it is sync or queued

**New Desktop Runtime Logic:**
- `electron/` for runtime behavior
- `scripts/` for build/packaging validation

---
*Update when route structure, module ownership, or major directories change.*