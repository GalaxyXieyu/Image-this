# Technology Stack

**Analysis Date:** 2026-05-26

## Languages

**Primary:**
- TypeScript - 应用代码、Next.js 路由、React 组件、部分脚本

**Secondary:**
- JavaScript / CommonJS - Electron 主进程与部分构建脚本
- PowerShell / Shell / Batch - Windows 更新发布与跨平台清理构建脚本

## Runtime

**Environment:**
- Node.js 20-23 之间，`package.json` 约束为 `>=20 <24`
- 浏览器渲染运行时由 Electron 承载，生产环境通过 Electron 启动内嵌 Next standalone 服务

**Package Manager:**
- npm
- Lockfile: `package-lock.json` 已存在

## Frameworks

**Core:**
- Next.js 15.3.4 - Web UI、API routes、桌面端内嵌服务
- React 19 - 前端组件和页面
- Electron 39 - 桌面壳、子进程启动、IPC、自动更新

**Testing:**
- Playwright - 截图与端到端脚本能力已安装，但仓库内未形成完整测试体系

**Build/Dev:**
- TypeScript 5
- Prisma 5.22
- electron-builder 26

## Key Dependencies

**Critical:**
- `@prisma/client` / `prisma` - SQLite 数据访问与 schema 管理
- `next-auth` - 用户认证、session 与桌面端本地登录流程
- `sharp` - 图片处理相关原生依赖，Windows 打包单独处理
- `electron-updater` - Windows 安装版自动更新
- `zustand` - 工作区状态管理

**Infrastructure:**
- `bcryptjs` - 密码认证
- `axios` / `node-fetch` / 原生 `fetch` - 外部 API 调用
- `react-hook-form` / `zod` - 表单和参数校验

## Configuration

**Environment:**
- 使用 `.env.production` 与 Electron 主进程注入的环境变量
- 关键配置包括 `DATABASE_URL`、`NEXTAUTH_URL`、`NEXTAUTH_SECRET`、各 AI provider 的 API 凭据

**Build:**
- `next.config.ts` - standalone 输出与服务端外部包配置
- `package.json` 中的 `build` 段 - Electron 打包目标、文件过滤、Windows/macOS 配置
- `scripts/build-windows.mjs` - Windows 构建、Prisma/sharp/runtime 组装

## Platform Requirements

**Development:**
- macOS / Linux / Windows 均可开发
- 桌面场景下需要 Node、npm、本地 SQLite 文件访问能力

**Production:**
- 当前重点交付是 Electron 桌面应用，尤其是 Windows 安装包与 Portable 包
- Next.js 以 standalone 子进程方式嵌入桌面应用，而不是独立云部署

---
*Stack analysis: 2026-05-26*
*Update after major dependency changes*
