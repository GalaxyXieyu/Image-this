# Phase 3 Context: App Log Observability

## Problem

用户现在排查桌面问题需要手动去文件夹找日志。Windows 安装版下日志目录不直观，且目录未来还可能支持自定义，导致“看日志”变成高摩擦操作。对于后台 worker、更新、Next.js 服务、渲染器异常这类问题，日志是第一诊断入口，必须能在应用内直接查看。

## Current Evidence

- Electron 主进程日志写在 `~/ImagineThis/logs`，文件名按日期拆分为 `app-YYYY-MM-DD.log` 和 `error-YYYY-MM-DD.log`。
- `electron/main.js` 中 `log()` 同时写 console、普通日志和 warn/error 日志。
- Next.js 子进程 stdout/stderr 已被主进程接入 `log()`，所以服务端 API、worker 输出会进入桌面日志。
- 渲染器 console 只有 warn/error 会被写入主进程日志。
- `electron/preload.js` 目前只暴露文件/目录选择和更新 API，没有日志 IPC。
- 设置页已有“应用更新”和“后台任务”这类桌面运维入口，适合新增“日志诊断”入口。

## User Goals

1. 不需要打开文件夹，也能在应用内看日志。
2. 能看到普通日志和错误日志，优先定位 worker、接口、更新、启动失败。
3. Windows 安装版下日志目录可见、可打开，最好可自定义。
4. 自定义日志目录不应影响已有数据库和用户配置。
5. 日志查看不能把大文件一次性读进前端，避免卡死界面。

## Constraints

- 继续使用 Electron + Next.js 当前架构，不引入外部日志系统。
- 日志读取必须通过 Electron IPC 暴露受控能力，不能让前端任意读文件。
- 自定义目录要存到桌面配置文件或用户配置，不能跟数据库路径混淆。
- 日志内容可能包含接口错误、路径、少量配置片段，界面需要保守处理敏感字段。

## Recommended Direction

把日志能力分成“桌面主进程日志服务”和“设置页日志面板”两层：

1. Electron 主进程负责日志目录解析、文件列表、tail 读取、打开目录、选择目录、清空/导出。
2. preload 暴露 `window.electron.logs`，只允许固定日志目录内操作。
3. 设置页新增“日志诊断”分区，展示最近日志、错误日志、筛选和复制。
4. 默认日志目录改为 `app.getPath('userData')/logs` 或继续兼容 `~/ImagineThis/logs`，但界面展示实际目录。
5. 支持自定义日志目录时，先保存配置，再安全重建 write stream；保留旧日志目录不删除。

## Open Questions

- 是否要保留当前 `~/ImagineThis/logs` 作为默认路径，还是迁移到系统标准 `userData/logs`？
- “清空日志”是否需要做确认和备份？
- 是否需要一键打包诊断包，包括日志、版本、平台、数据库路径，但不包含数据库本体？
