# Codebase Structure

**Analysis Date:** 2026-05-26

## Directory Layout

```text
Image-this/
├── electron/                 # Electron 主进程、数据库准备、预加载、更新
├── prisma/                   # Prisma schema、迁移、模板数据库
├── public/                   # 静态资源、图标
├── scripts/                  # 构建、打包、验证、部署脚本
├── src/
│   ├── app/                  # Next.js App Router 页面与 API routes
│   ├── components/           # UI 组件、工作区组件、导航组件
│   ├── features/             # 局部特性抽象（工作区 hooks 等）
│   ├── hooks/                # 通用 React hooks
│   ├── lib/                  # 核心业务逻辑、存储、auth、provider 适配
│   ├── providers/            # React provider
│   ├── stores/               # Zustand store
│   └── types/                # 全局类型
├── .planning/                # GSD 项目状态、roadmap、phase 文档
├── next.config.ts            # Next.js 配置
└── package.json              # 依赖、脚本、Electron build 配置
```

## Directory Purposes

**electron/**
- Purpose: 桌面运行时入口和本地环境准备
- Contains: `main.js`, `preload.js`, `database-manager.js`, `update-manager.js`
- Key files: `electron/main.js` - 启动链路中枢
- Subdirectories: 无明显嵌套层次

**prisma/**
- Purpose: 数据模型和桌面端模板库
- Contains: `schema.prisma`, `migrations/`, `app.db`
- Key files: `prisma/schema.prisma`
- Subdirectories: `migrations/`

**scripts/**
- Purpose: 打包、构建、清理与验证
- Contains: `build-windows.mjs`, `build-mac.mjs`, `verify-build.js`, `run-next-build.mjs`
- Key files: `scripts/build-windows.mjs`
- Subdirectories: 无

**src/app/**
- Purpose: Next.js 页面、布局、API routes
- Contains: `page.tsx`, `workspace/page.tsx`, `api/**/route.ts`
- Key files: `src/app/workspace/page.tsx`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/worker/route.ts`
- Subdirectories: `api/`, `auth/`, 多个页面目录

**src/lib/**
- Purpose: 应用核心逻辑和集成层
- Contains: auth、storage、provider、image-processor、desktop helpers
- Key files: `src/lib/prisma.ts`, `src/lib/storage.ts`, `src/lib/user-config.ts`, `src/lib/image-processor/service.ts`
- Subdirectories: `image-processor/`

## Key File Locations

**Entry Points:**
- `electron/main.js`: Electron 桌面入口
- `src/app/layout.tsx`: Next.js 根布局
- `src/app/workspace/page.tsx`: 核心工作区页面

**Configuration:**
- `package.json`: scripts、依赖、Electron build
- `next.config.ts`: Next standalone 与 serverExternalPackages
- `prisma/schema.prisma`: 数据模型与索引

**Core Logic:**
- `src/app/api/tasks/route.ts`: 任务创建和任务列表查询
- `src/app/api/tasks/worker/route.ts`: 队列消费逻辑
- `src/lib/storage.ts`: 存储抽象
- `src/lib/local-storage.ts`: 本地文件系统访问

**Testing:**
- `scripts/test-video-api.ts`: 零散脚本式测试
- `playwright` 作为依赖存在，但未形成固定测试目录

**Documentation:**
- `AGENTS.md`: 项目级代理规则
- `.planning/`: GSD 分析、roadmap、phase 文档

## Naming Conventions

**Files:**
- React 组件多为 `PascalCase.tsx`
- hooks 和大多数模块文件多为 `kebab-case.ts` 或 `camelCase` 风格混合
- API 路由统一采用 `route.ts`

**Directories:**
- Next.js 页面目录按路由语义组织
- `lib/` 按业务/基础设施职责拆分

**Special Patterns:**
- `src/app/api/**/route.ts` 表示 API 边界
- `service.ts` 常作为业务逻辑实现文件
- `page.tsx` 表示页面入口

## Where to Add New Code

**New Desktop Runtime Logic:**
- Primary code: `electron/`
- Verification or packaging: `scripts/`

**New API Endpoint:**
- Definition: `src/app/api/<feature>/route.ts`
- Shared logic: `src/lib/` 或 `src/app/api/<feature>/service.ts`

**New Workspace/Task Feature:**
- UI: `src/components/workspace/` 或 `src/app/workspace/page.tsx`
- State/hooks: `src/hooks/` 或 `src/features/workspace/hooks/`

**Utilities:**
- Shared helpers: `src/lib/`
- Types: `src/types/`

## Special Directories

**.next/**
- Purpose: Next build 输出
- Source: 构建自动生成
- Committed: No

**dist-electron/**
- Purpose: Electron 打包产物
- Source: `electron-builder`
- Committed: No

**.planning/**
- Purpose: GSD 项目上下文、状态和执行计划
- Source: 人工分析与后续 workflow 生成
- Committed: 视团队约定，当前建议保留

---
*Structure analysis: 2026-05-26*
*Update when directory structure changes*
