# Plan 01-01 Summary

**Phase:** `01-desktop-runtime-performance`  
**Plan:** `01-01`  
**Status:** Implemented in code, pending Windows runtime verification  
**Updated:** 2026-05-26

## Goal

建立桌面端常驻后台 worker 调度链路，并让 worker 失败对前端可见，不再只依赖页面触发 `/api/tasks/worker`。

## Implemented

### 1. Electron 常驻 worker 调度

- 在 Electron 主进程中加入后台 worker 调度器
- Next 子进程启动完成后开始周期性触发 `/api/tasks/worker`
- 应用退出或 Next 子进程退出时停止调度器

关键实现：
- `electron/main.js`
  - `triggerBackgroundWorker()`
  - `startWorkerScheduler()`
  - `stopWorkerScheduler()`

### 2. worker 启动失败的前端可见性

- 批量任务创建链路的 worker 触发失败现在会 toast
- 视频任务入口的 worker 触发失败现在会 toast
- 历史页手动触发 worker 失败现在会 toast
- 全局任务统计会在失败数上升时提醒用户

关键实现：
- `src/hooks/useImageProcessing.ts`
- `src/app/workspace/page.tsx`
- `src/app/history/page.tsx`
- `src/components/navigation/TaskStatsPopover.tsx`

### 3. worker 输出负载开始收敛

- worker 持久化结果改为轻量对象，不再把完整大结果对象直接塞进 `outputData`
- 图像任务持久化 `processedImageId / processedImageUrl`
- 视频任务持久化 `videoUrl / jimengTaskId / prompt / frames / aspectRatio`

关键实现：
- `src/app/api/tasks/worker/route.ts`

## Verification Completed

- 代码层确认 Electron 主进程存在独立后台调度入口
- 代码层确认前端存在 worker 启动失败提示路径
- 代码层确认 worker 输出持久化已开始瘦身

## Verification Still Required

以下验证必须在 Windows 实机完成：

- `01-WINDOWS-REGRESSION.md` Case 5：worker 启动失败前端提示
- `01-WINDOWS-REGRESSION.md` Case 6：后台任务最终失败全局提醒
- `01-WINDOWS-REGRESSION.md` Case 7：应用重启后卡住任务恢复

## Residual Risks

- 当前后台调度仍然是基于主进程定时 POST，不是独立原生 job runner
- 尚未在 Windows 上真实验证“窗口关闭/重开/重启后任务推进”的最终行为
- worker 恢复逻辑尚未单独重构，只是与新调度器形成了更稳定的配合

## Files Touched

- `electron/main.js`
- `src/app/api/tasks/worker/route.ts`
- `src/hooks/useImageProcessing.ts`
- `src/app/workspace/page.tsx`
- `src/app/history/page.tsx`
- `src/components/navigation/TaskStatsPopover.tsx`

## Outcome

Plan 01-01 的主代码目标已完成，当前剩余阻塞主要是 Windows 实机验证。
