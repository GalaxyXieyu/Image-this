# Testing Patterns

**Analysis Date:** 2026-06-03

## Current Test Posture

当前仓库更偏“构建验证 + 脚本验证 + 人工 smoke”，还没有稳定的单元测试、集成测试或 E2E 测试目录。

## Available Commands

```bash
npm run lint
npm run build
npm run build:windows
npm run build:mac
npm run screenshots:readme
node scripts/verify-build.js
```

## Installed Tooling

**Playwright**
- 已安装。
- 当前主要用于 README 截图生成脚本。
- 还没有形成固定 `tests/` 或 `e2e/` 套件。

**ESLint**
- 依赖存在，脚本为 `npm run lint`。
- 注意：当前 `package.json` 中脚本是 `next lint`，而 Next.js 15 以后该命令可用性需要实际验证。
- `next.config.ts` 中 `ignoreDuringBuilds: true`，说明 build 不强制阻断 lint。

**TypeScript**
- 类型检查由 Next build 和编辑器共同承担。
- 当前没有单独 `tsc --noEmit` 脚本。

## Verification Scripts

**Build/Packaging:**
- `scripts/run-next-build.mjs`：Next build 包装入口。
- `scripts/build-windows.mjs`：Windows 打包主路径。
- `scripts/build-mac.mjs`：macOS 打包主路径。
- `scripts/verify-build.js`：打包产物完整性检查。

**Screenshots:**
- `scripts/generate-readme-screenshots.mjs`：通过 Playwright 生成 README 截图。

**Manual/Ad-hoc:**
- `scripts/test-video-api.ts`：视频 API 脚本式验证。
- `scripts/manual-test-volcengine-enhance.mjs`：火山高清化手工验证。

## What Is Not Yet Standardized

**Unit Tests:**
- 没有 Vitest/Jest 配置。
- 没有稳定的 `*.test.ts` / `*.spec.ts` 结构。

**Integration Tests:**
- 任务队列、worker、provider adapter、storage、Prisma 查询没有系统化测试。

**E2E Tests:**
- Playwright 存在，但没有产品主流程测试套件。
- 桌面端 Electron smoke 没有固定自动化脚本。

**Fixtures/Mocks:**
- 没有统一 fixture/factory。
- 外部 AI provider、图床、文件系统、SQLite 测试隔离都还没成体系。

## High-Value Test Targets

**Task Queue:**
- 创建任务。
- 批量创建任务。
- 状态轮询。
- worker 领取任务。
- 失败重试。
- 取消/删除任务。

**Storage Boundary:**
- 上传素材保存。
- 本地文件 URL 转换。
- `/api/files/[...path]` 访问。
- 结果图片和视频路径回填。

**Provider Boundary:**
- 用户未配置密钥时的错误提示。
- provider 参数映射。
- provider 返回体标准化。
- 图床 URL 与 base64 转换。

**Desktop Runtime:**
- 数据库准备。
- Next standalone 子进程启动。
- `/api/health` 探活。
- 更新元信息读取。
- 打包后 Prisma/sharp 可用性。

**Product Flow:**
- 注册/登录。
- 配置 provider。
- 上传图片。
- 创建任务。
- 任务进度展示。
- 结果查看和重试。

## Suggested Test Architecture

**Near-Term:**
- 增加 API/worker 的最小集成测试。
- 增加 storage URL 转换和任务输出标准化的单元测试。
- 增加 Playwright smoke：登录页、首页、任务中心、设置页、场景工作区可打开。

**Mid-Term:**
- provider adapter 使用 mock 响应测试。
- SQLite 使用临时测试库。
- Electron 打包后启动 smoke。

**Long-Term:**
- 固定 CI 中的 lint、typecheck、unit、integration、build smoke。
- 建立 Windows 桌面升级和数据保留回归测试。

## Current Risk from Test Gaps

- worker 文件复杂但无自动化保护，改动容易引入任务状态回归。
- 桌面打包链路长，资源缺失常到运行时才暴露。
- provider 配置和本地文件 URL 是跨边界问题，人工测试覆盖不稳定。
- 轮询接口和任务 payload 变更可能影响多个页面，但没有契约测试。

---
*Update when formal test framework, test folders, CI gates, or verification scripts change.*