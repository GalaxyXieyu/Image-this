# Requirements: Image This Runtime and Performance

**Core Value:** 桌面端任务必须稳定入队、持续后台处理，并在 Windows 上保持可接受的启动与接口响应速度。

## Active Requirements

### PERF-01 - Desktop Background Processing
桌面端任务处理必须由稳定的后台 worker 驱动，而不是依赖页面主动调用 `/api/tasks/worker`。

### PERF-02 - Lightweight Task Status Path
任务状态查询接口必须只返回轮询所需的轻量字段，避免把大 JSON、base64 和无关统计一起返回。

### PERF-03 - Windows Runtime Performance
Windows 版必须针对 SQLite、本地文件 IO、启动 warmup 和日志写入做专项调优，降低接口体感延迟。

### PERF-04 - Evidence-Based Verification
所有性能治理都必须附带可执行的验证手段，包括日志、接口耗时、查询路径或启动链路检查。

### PERF-05 - Worker Failure Visibility
worker 触发失败、执行失败、重试失败和恢复失败必须能明确反馈到前端界面，而不是只出现在日志或失败计数里。

### PERF-06 - Update and Reinstall Data Safety
Windows 安装、重装、卸载和自动更新流程不能默认删除用户数据库、密钥配置和历史文件，除非用户显式选择清理数据。

## Non-Requirements

- 本轮不扩展新的 AI 模型能力
- 本轮不做全站 UI 视觉重构
- 本轮不切换出 Prisma/SQLite 主栈
