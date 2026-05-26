# Plan 02-03 Summary

**Phase:** `02-task-input-asset-references`  
**Plan:** `02-03`  
**Status:** Implemented in code  
**Updated:** 2026-05-26

## Goal

让 worker 真正消费输入资产引用，并在迁移期兼容旧任务模型。

## Implemented

### 1. worker 输入兼容层

- 在 `src/app/api/tasks/worker/route.ts` 增加：
  - `TaskAssetRef`
  - `ParsedTaskInput`
  - `readAssetAsDataUrl()`
  - `resolveTaskInputData()`

这让 worker 能优先读取：
- `inputAsset`
- `referenceAsset`
- `watermarkLogoAsset`

读不到时回退到旧字段：
- `imageUrl`
- `referenceImageUrl`
- `watermarkLogoUrl`

### 2. 各任务类型开始消费新输入模型

以下任务处理分支已经切换到“先读 asset，旧字段兜底”的方式：

- `processOneClickWorkflow`
- `processBackgroundRemoval`
- `processImageExpansion`
- `processImageUpscaling`
- `processWatermark`
- `processVideoGeneration`

这意味着：
- 新任务已经可以真正跑通 `inputAsset/referenceAsset`
- 老任务仍可继续运行

### 3. 历史页兼容新输入模型

- 历史页获取原图 URL 时，已开始优先解析：
  - `inputData.inputAsset.clientUrl`
- 没有时再回退旧字段：
  - `imageUrl`
  - `originalUrl`
  - `sourceUrl`

关键实现：
- `src/app/history/page.tsx`

### 4. 重试 / 恢复链路兼容结论

- `retry` 路由直接复制原 `inputData` 建新任务，因此天然保留新 asset 引用
- `recover` 路由只处理任务状态，不依赖输入模型，天然兼容新旧结构

## Verification Completed

- 代码层确认 worker 新旧输入模型双轨兼容逻辑已存在
- 代码层确认视频、图片、水印、一键工作流都已开始优先读取 asset 引用
- 代码层确认历史页不会因输入引用化丢失原图入口

## Residual Risks

- 当前 worker 仍会把 asset 文件读成 data URL 再交给现有 provider/service，这属于过渡态
- provider/service 内部仍大量假设输入是 `imageUrl` / base64，后续可以继续向“按需 boundary 转换”收缩
- 还没有把历史遗留任务里的旧 base64 数据清理掉，这属于后续治理范围

## Files Touched

- `src/app/api/tasks/worker/route.ts`
- `src/app/history/page.tsx`

## Outcome

Plan 02-03 已完成 Phase 2 所要求的迁移兼容闭环：前端新任务可以发送 asset 引用，worker 可以消费它们，旧任务仍然可运行。
