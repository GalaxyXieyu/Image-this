# Phase 2: Task Input Asset References - Context

**Gathered:** 2026-05-26
**Status:** Ready for planning
**Source:** Runtime/performance follow-up and payload analysis

<domain>
## Phase Boundary

本 phase 聚焦“输入资产引用化”，目标是把任务输入从前端 base64 JSON 迁移为本地资产引用。范围覆盖任务创建链路、输入资产持久化、worker 消费输入、provider 调用边界和必要的历史/恢复兼容逻辑。

它不处理新的模型能力、不替换 Prisma/SQLite，也不重写当前桌面 runtime 主结构。

</domain>

<decisions>
## Implementation Decisions

### Input Transport
- 前端不再直接把原图或参考图的 base64 塞进 `task_queue.inputData`
- 任务队列应持有“输入资产引用”，而不是大体积图片字符串

### Asset Persistence
- 桌面端优先使用本地文件系统承载输入资产
- 输入资产需要具备稳定引用，供 worker 重试、恢复和延迟消费

### Provider Boundary
- 如果第三方 provider 最终必须接收 base64，应只在 worker 真正调用 provider 前做按需转换
- 数据库和轮询接口不应长期承载 base64

### Compatibility
- 需要考虑与现有历史任务、重试任务和恢复逻辑的兼容
- 迁移期间可能需要同时兼容“老任务走 base64、任务走 asset 引用”

### the agent's Discretion
- assetId 的结构设计
- 输入资产目录位置与清理策略
- 是否引入单独的输入资产表，或先复用本地路径 + 轻量 metadata

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Task creation and polling
- `src/hooks/useImageProcessing.ts` — 当前批量任务创建与 worker 触发入口
- `src/app/workspace/page.tsx` — 视频任务当前直接 `readAsDataURL()`
- `src/app/api/tasks/route.ts` — 任务入队接口
- `src/app/api/tasks/worker/route.ts` — worker 当前直接消费 `inputData.imageUrl`

### Storage and config
- `src/lib/storage.ts` — 本地/逻辑存储抽象
- `src/lib/local-storage.ts` — 本地文件系统实现
- `src/lib/user-config.ts` — 用户保存路径配置与缓存

### Current output/runtime optimizations
- `electron/main.js` — 当前桌面端常驻 worker 调度
- `.planning/phases/01-desktop-runtime-performance/01-01-PLAN.md`
- `.planning/phases/01-desktop-runtime-performance/01-02-PLAN.md`
- `.planning/phases/01-desktop-runtime-performance/01-03-PLAN.md`

</canonical_refs>

<specifics>
## Specific Ideas

- 新增输入资产落地 API 或本地辅助函数，先存文件再建任务
- `task.inputData` 只保留 `inputAssetId` / `referenceAssetId` / 少量参数
- worker 读取本地文件，必要时临时转 base64
- 增加迁移兼容：优先读 `assetRef`，没有再回退旧 `imageUrl`

</specifics>

<deferred>
## Deferred Ideas

- 云端统一素材服务
- 去掉所有历史任务中的 base64 遗留数据
- 完全重构任务模型和历史页展示层

</deferred>

---

*Phase: 02-task-input-asset-references*
*Context gathered: 2026-05-26 via payload analysis*
