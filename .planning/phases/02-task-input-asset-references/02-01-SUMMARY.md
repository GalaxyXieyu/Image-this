# Plan 02-01 Summary

**Phase:** `02-task-input-asset-references`  
**Plan:** `02-01`  
**Status:** In progress  
**Updated:** 2026-05-26

## Goal

建立输入资产落地能力，让任务创建从“直接塞 base64”过渡到“先保存输入资产，再传引用”。

## Implemented So Far

### 1. 本地输入资产目录能力

- 在本地存储层中增加了专门的输入资产目录概念
- 新增：
  - `INPUT_ASSET_DIR_NAME`
  - `getInputAssetDir()`
  - `ensureInputAssetDirExists()`

关键实现：
- `src/lib/local-storage.ts`

### 2. 输入资产引用结构

- 新增 `StoredInputAssetRef` / `InputAssetRef`
- 当前引用结构包含：
  - `assetId`
  - `filePath`
  - `clientUrl`
  - `originalFilename`
  - `mimeType`
  - `sizeBytes`

关键实现：
- `src/lib/local-storage.ts`
- `src/lib/storage.ts`

### 3. 输入资产保存入口

- 新增 `saveInputAssetToLocal()`
- 新增 `saveInputAsset()`
- 为后续前端任务创建链路改造提供统一入口

关键实现：
- `src/lib/local-storage.ts`
- `src/lib/storage.ts`

### 4. 任务接口的结构兼容入口

- `src/app/api/tasks/route.ts` 增加了 `normalizeTaskInputData()`
- 当前先为后续 `inputAsset/referenceAsset` 输入保留结构接入点

关键实现：
- `src/app/api/tasks/route.ts`

## Not Done Yet

- 前端任务创建链路还没有切到 `saveInputAsset()`，这属于 `02-02`
- worker 还没有读取 `inputAsset/referenceAsset`，这属于 `02-03`
- 旧任务 / 新任务迁移兼容还没完成闭环

## Verification Completed

- 代码层确认输入资产保存能力与引用结构已经存在
- 代码层确认任务接口已具备接入新输入结构的基础入口

## Residual Risks

- 当前 `clientUrl` 仍是第一版协议，后续可能需要根据实际 `/api/files` 访问规则微调
- 输入资产还没有和前端真实创建链路接通，因此暂时无法视为功能完成

## Files Touched

- `src/lib/local-storage.ts`
- `src/lib/storage.ts`
- `src/app/api/tasks/route.ts`

## Outcome

Plan 02-01 已经进入执行并完成基础设施首轮落地，下一步应继续推进 `02-02`，把前端任务创建真正切到输入资产引用。
