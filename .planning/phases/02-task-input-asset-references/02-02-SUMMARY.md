# Plan 02-02 Summary

**Phase:** `02-task-input-asset-references`  
**Plan:** `02-02`  
**Status:** Implemented in code, pending worker-side consumption  
**Updated:** 2026-05-26

## Goal

把前端任务创建链路从“直接把图片 base64 塞进任务队列”改成“先保存输入资产，再传引用”。

## Implemented

### 1. 新增输入资产上传接口

- 新增 `/api/input-assets`
- 支持上传：
  - `input`
  - `reference`
  - `watermarkLogo`
- 返回：
  - `inputAsset`
  - `referenceAsset`
  - `watermarkLogoAsset`

关键实现：
- `src/app/api/input-assets/route.ts`

### 2. 批量图片任务创建链路改造

- `useImageProcessing.ts` 中的以下链路开始默认使用输入资产引用：
  - `handleExpansion`
  - `handleUpscaling`
  - `handleOneClick`
  - `handleBackgroundReplace`
  - `handleWatermark`

关键变化：
- 不再把 `imageUrl: resizedImageUrl` 直接塞进任务
- 改为传 `inputAsset`
- 参考图改为 `referenceAsset`
- logo 改为 `watermarkLogoAsset`

关键实现：
- `src/hooks/useImageProcessing.ts`

### 3. 视频任务创建链路改造

- `workspace/page.tsx` 中视频任务不再 `readAsDataURL(selectedImage.file)`
- 改为先 POST `/api/input-assets`
- 再把 `inputAsset` 塞进 `VIDEO_GENERATION` 任务

关键实现：
- `src/app/workspace/page.tsx`

## Verification Completed

- 代码层确认新任务创建入口已开始使用 `/api/input-assets`
- 代码层确认批量任务与视频任务的 payload 里已引入 `inputAsset/referenceAsset/watermarkLogoAsset`
- 代码层确认前端新任务创建主路径已不再以 base64 作为默认主输入

## Not Done Yet

- worker 还没有消费 `inputAsset/referenceAsset`，这属于 `02-03`
- 当前旧字段兼容仍然保留
- 还没有对“队列 payload 体积实际下降值”做实测记录

## Residual Risks

- 当前前端已经开始发送新 asset 引用，但 worker 侧仍需在下一步接上读取逻辑
- 过渡阶段存在“新任务创建已切换、执行层仍在兼容旧模型”的双轨状态

## Files Touched

- `src/app/api/input-assets/route.ts`
- `src/hooks/useImageProcessing.ts`
- `src/app/workspace/page.tsx`

## Outcome

Plan 02-02 的前端主链路已经切到输入资产引用化，下一步必须继续完成 `02-03`，让 worker 和恢复/重试链路真正消费新模型。
