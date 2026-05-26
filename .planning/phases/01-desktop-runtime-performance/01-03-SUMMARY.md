# Plan 01-03 Summary

**Phase:** `01-desktop-runtime-performance`  
**Plan:** `01-03`  
**Status:** Implemented in code, pending Windows install/update verification  
**Updated:** 2026-05-26

## Goal

针对 Windows 本地运行环境做数据库、文件 IO、安装更新数据安全和启动链路调优，降低接口与启动体感延迟并确保不会默认删库。

## Implemented

### 1. SQLite 桌面端 PRAGMA 调优

- 在桌面数据库准备流程中加入：
  - `journal_mode=WAL`
  - `synchronous=NORMAL`
  - `temp_store=MEMORY`
  - `foreign_keys=ON`

关键实现：
- `electron/database-manager.js`

### 2. 启动主链路延后非关键 warmup

- `bootstrapApplication()` 不再同步等待 `warmupApplication()`
- 改为主页面加载后延迟执行 warmup
- 保持启动更聚焦在：数据库准备 → Next 服务启动 → 窗口加载

关键实现：
- `electron/main.js`

### 3. 主进程日志写入去同步阻塞

- 把 `appendFileSync` 改为 `createWriteStream(..., { flags: 'a' })`
- 普通日志写主日志文件
- `WARN/ERROR` 同时写错误日志文件

关键实现：
- `electron/main.js`

### 4. 本地上传目录存在性检查去重

- 为 `ensureUploadDirExists()` 增加目录缓存
- 已确认目录不会在同一进程内重复 `fs.access` / `fs.mkdir`

关键实现：
- `src/lib/local-storage.ts`

### 5. 存储层热路径去重样板

- 抽出 `resolveCustomStoragePath()`，统一用户自定义路径解析
- `ensureBucketExists` / `uploadImage` / `uploadBase64Image` / `deleteImage` / `generateAndUploadThumbnail` / `checkImageExists` 共用同一路径解析逻辑

关键实现：
- `src/lib/storage.ts`

### 6. 安装/卸载默认保数据

- NSIS 安装脚本不再在默认安装和卸载流程中清理用户数据目录

关键实现：
- `build/installer.nsh`

## Verification Completed

- 代码层确认桌面数据库准备流程包含明确 PRAGMA 调优
- 代码层确认 `warmupApplication()` 已从启动主阻塞路径移开
- 代码层确认主进程日志不再使用 `appendFileSync`
- 代码层确认本地存储目录检查与路径解析热路径得到收敛
- 代码层确认安装/卸载默认行为不再主动删用户数据

## Verification Still Required

以下验证必须在 Windows 实机完成：

- `01-WINDOWS-REGRESSION.md` Case 1：首次安装后数据库初始化正常
- `01-WINDOWS-REGRESSION.md` Case 2：覆盖安装保留数据库和配置
- `01-WINDOWS-REGRESSION.md` Case 3：卸载默认不删数据
- `01-WINDOWS-REGRESSION.md` Case 4：重装后读回原数据库
- `01-WINDOWS-REGRESSION.md` Case 8：自动更新后保留数据库

## Residual Risks

- 当前日志改为 stream 写入，但尚未在 Windows 打包态下实测日志文件轮转和关闭行为
- PRAGMA 调优已加入桌面初始化，但尚未用真实 Windows 机器测出启动和接口体感收益
- 安装/自动更新数据安全的关键验证仍依赖 Windows 安装版实机执行

## Files Touched

- `electron/database-manager.js`
- `electron/main.js`
- `src/lib/local-storage.ts`
- `src/lib/storage.ts`
- `build/installer.nsh`

## Outcome

Plan 01-03 的代码级优化已经形成可验证基线，当前剩余阻塞主要集中在 Windows 安装版与自动更新实机验证。
