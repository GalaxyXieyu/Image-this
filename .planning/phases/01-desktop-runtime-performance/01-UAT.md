---
status: partial
phase: 01-desktop-runtime-performance
source: 01-01-PLAN.md, 01-03-PLAN.md
started: 2026-05-26T02:15:12Z
updated: 2026-05-26T02:15:12Z
---

## Current Test

[testing paused — awaiting Windows machine]

## Tests

### 1. 覆盖安装保留数据库和配置
expected: 直接覆盖安装新版本后，历史任务、配置和 `app.db` 仍存在
result: blocked
blocked_by: physical-device
reason: 需要 Windows 安装版实机验证

### 2. 卸载后用户数据默认保留
expected: 卸载应用后，`userData/data/app.db` 和 `userData/config/` 仍存在
result: blocked
blocked_by: physical-device
reason: 需要 Windows 卸载流程实机验证

### 3. 重装后读取原数据库
expected: 卸载并重装后，旧历史任务和配置可被重新读取
result: blocked
blocked_by: physical-device
reason: 需要 Windows 实机验证

### 4. worker 启动失败前端提示
expected: `POST /api/tasks/worker` 失败时，工作区或任务中心会出现明确错误提示
result: blocked
blocked_by: physical-device
reason: 需要 Windows 桌面运行态构造失败场景

### 5. 后台任务最终失败全局提醒
expected: 后台失败任务出现时，顶部任务统计会提示失败数增加，任务中心可见失败详情
result: blocked
blocked_by: physical-device
reason: 需要 Windows 实机验证桌面态行为

### 6. 重启后卡住任务恢复
expected: 强制关闭应用后，原 `PROCESSING` 任务在重启后能恢复或明确失败
result: blocked
blocked_by: physical-device
reason: 需要 Windows 实机验证

### 7. 自动更新保留数据库
expected: 安装版通过自动更新升级后，历史任务、配置和数据库仍存在
result: blocked
blocked_by: release-build
reason: 需要可用的 Windows 更新源与安装版实机验证

## Summary

total: 7
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 7

## Gaps

- truth: "Windows 覆盖安装后数据库和配置仍被保留"
  status: blocked
  reason: "尚无 Windows 实机，等待执行 .planning/phases/01-desktop-runtime-performance/01-WINDOWS-REGRESSION.md"
  severity: major
  test: 1
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "worker 启动失败时用户能在前端看到明确提示"
  status: blocked
  reason: "尚无 Windows 实机，等待验证桌面态实际表现"
  severity: major
  test: 4
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "自动更新升级后原数据库和配置仍被保留"
  status: blocked
  reason: "尚无 Windows 更新环境，等待安装版更新链路验证"
  severity: blocker
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
