# worker/route.ts 拆分评估（高风险，仅安全抽离）

## 结论
- **允许安全抽离**：纯资产 I/O / 类型 / JSON 解析（已落地 `src/lib/workbench/task-asset-utils.ts`）。
- **暂不整文件重写 / 不抽调度核心**：`claimPendingTasks`、`processSingleTask`、重试/fence/`startedAt` 指纹、并发 batch 必须留在 route 内，避免重复计费与状态回写竞态。
- **legacy process* 方法**：已有 v2 handler registry（`src/lib/workbench/handlers/*`）。进一步抽 legacy 方法可作为后续专项，需单独回归所有任务类型；本目标不强制完成整包搬迁。

## 当前行数
- `src/app/api/tasks/worker/route.ts`：约 1444（已从 1528 下降）
- `src/lib/workbench/task-asset-utils.ts`：约 97

## 验收
- worker 仍由 `/api/tasks/worker` POST/GET 入口驱动
- pipeline/outpaint 等 handler 注册 import 保留
- tsc 通过
