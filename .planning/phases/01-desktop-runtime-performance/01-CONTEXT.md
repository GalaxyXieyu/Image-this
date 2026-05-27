# Phase 1: Desktop Runtime & Performance - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Brownfield runtime and performance analysis

<domain>
## Phase Boundary

本 phase 只处理桌面端运行时稳定性和 Windows 性能问题，覆盖 Electron 主进程、任务 worker、`/api/tasks` 查询路径、SQLite 与本地文件 IO。它不扩展新的 AI 能力，不重做 UI，也不引入大规模架构迁移。

</domain>

<decisions>
## Implementation Decisions

### Runtime
- 任务消费必须从“页面调用 API 触发”收敛为稳定的后台处理机制
- Electron 主进程仍然是桌面端 runtime 的唯一编排入口
- worker 的触发失败、执行失败和重试耗尽必须能被前端界面感知

### Task Data
- `task_queue` 应只保留轻量任务元数据，不继续承载大体积 base64/结果大 JSON
- 轮询状态查询和任务历史列表必须拆开职责

### Performance
- Windows 优化优先关注 SQLite 写入、任务轮询体积、启动链路同步 IO 和 warmup 阻塞
- 所有优化都需要带验证方式，而不是只做“感觉更快”

### Data Safety
- Windows 安装、重装、自动更新不能默认删除 `app.getPath('userData')` 下的数据库和配置
- 任何清理用户数据的行为都必须是显式选择，而不是安装脚本默认行为

### the agent's Discretion
- 具体选择常驻 worker 的实现形态：主进程循环、子进程 worker、或定时调度
- 轻量状态接口的数据结构设计
- SQLite 调优参数的具体取值与落点

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Desktop runtime
- `electron/main.js` — Electron 主进程启动、子进程、warmup、窗口生命周期
- `electron/database-manager.js` — 桌面 SQLite 模板、迁移、secret store 管理
- `electron/update-manager.js` — Windows 安装版自动更新链路

### Task queue and polling
- `src/app/api/tasks/route.ts` — 任务创建、列表查询、统计查询
- `src/app/api/tasks/worker/route.ts` — 当前任务消费器实现
- `src/hooks/useTaskPolling.ts` — 工作区轮询实现
- `src/components/navigation/FloatingTaskButton.tsx` — 任务状态与最近任务轮询
- `src/hooks/useImageProcessing.ts` — worker 触发失败当前仅写 console

### Persistence and storage
- `prisma/schema.prisma` — `TaskQueue` / `ProcessedImage` 模型和索引
- `src/lib/prisma.ts` — Prisma client 初始化
- `src/lib/storage.ts` — 存储抽象
- `src/lib/local-storage.ts` — 本地文件系统实现

### Build and Windows packaging
- `scripts/build-windows.mjs` — Windows 打包、Prisma/sharp/runtime 组装
- `scripts/verify-build.js` — Windows 构建结果验证
- `build/installer.nsh` — 安装/卸载时用户数据目录清理逻辑

</canonical_refs>

<specifics>
## Specific Ideas

- 拆分 `/api/tasks/status`，只返回 `id/status/progress/currentStep/processedImageId`
- 用专门字段代替 `inputData/outputData` 中的重对象
- 为 SQLite 增加 `WAL`、`busy_timeout`、`synchronous=NORMAL`
- 把启动 warmup 改为首屏后后台执行

</specifics>

<deferred>
## Deferred Ideas

- 云端部署性能优化
- 新模型接入与新工作流功能
- 全面 UI 重构

</deferred>

---

*Phase: 01-desktop-runtime-performance*
*Context gathered: 2026-05-26 via brownfield analysis*
