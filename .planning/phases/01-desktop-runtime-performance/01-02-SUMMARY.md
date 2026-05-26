# Plan 01-02 Summary

**Phase:** `01-desktop-runtime-performance`  
**Plan:** `01-02`  
**Status:** Implemented in code  
**Updated:** 2026-05-26

## Goal

拆分任务列表接口与状态轮询接口，减少任务查询返回体积和数据库负载，并让工作区、浮动任务入口与历史页的职责分离。

## Implemented

### 1. 新增轻量状态接口

- 新增 `/api/tasks/status`
- 只返回轮询所需的最小字段：
  - `id`
  - `type`
  - `status`
  - `progress`
  - `currentStep`
  - `errorMessage`
  - `processedImageId`
  - `outputData`

关键实现：
- `src/app/api/tasks/status/route.ts`

### 2. 工作区轮询切换到轻量接口

- `useTaskPolling()` 不再请求 `/api/tasks?ids=...`
- 改为调用 `/api/tasks/status?ids=...`

关键实现：
- `src/hooks/useTaskPolling.ts`

### 3. `/api/tasks` 对 `ids` 查询增加轻量分支

- 如果请求带 `ids`，则：
  - 不再执行 `count/groupBy`
  - 不再走列表页重 relation 查询
  - 直接返回轻量任务状态

关键实现：
- `src/app/api/tasks/route.ts`

### 4. 浮动任务入口职责进一步分层

- 新增 `/api/tasks/recent`
- `FloatingTaskButton` 改为请求 recent 接口
- recent 接口在服务端直接派生：
  - `originalImageUrl`
  - `resultImageUrl`
  - `videoUrl`
- 前端不再自己 `JSON.parse(inputData/outputData)`

关键实现：
- `src/app/api/tasks/recent/route.ts`
- `src/components/navigation/FloatingTaskButton.tsx`

## Verification Completed

- 代码层确认工作区轮询已切到轻量状态接口
- 代码层确认 `/api/tasks?ids=` 不再顺带执行统计查询
- 代码层确认浮动任务入口已脱离重列表接口和前端 JSON 解析

## Verification Still Required

- 历史页、浮动任务按钮和工作区在真实运行时都能正常展示状态
- recent 接口在不同任务类型（图片、视频、失败任务）下展示正确

## Residual Risks

- `recent` 接口内部为了兼容旧任务，仍会在服务端解析 `inputData/outputData`
- 历史页依然需要重列表接口，这是合理的，但后续还可以继续优化查询字段
- 还没有在 Windows 实机上测接口体感差异，只完成了结构降载

## Files Touched

- `src/app/api/tasks/status/route.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/recent/route.ts`
- `src/hooks/useTaskPolling.ts`
- `src/components/navigation/FloatingTaskButton.tsx`

## Outcome

Plan 01-02 的主要结构目标已经完成，当前任务状态查询、最近任务卡片和历史列表已经具备明确分层。
