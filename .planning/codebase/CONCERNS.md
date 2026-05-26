# Codebase Concerns

**Analysis Date:** 2026-05-26

## Tech Debt

**Task worker lifecycle:**
- Issue: 任务消费逻辑挂在 `/api/tasks/worker` 路由，由页面或恢复逻辑主动触发
- Why: 早期实现更快落地，不需要额外 worker 进程或调度器
- Impact: 后台运行不稳定，UI 关闭后任务连续性差，worker 生命周期受 HTTP 请求绑架
- Fix approach: 把队列消费迁移为 Electron 主进程控制的常驻后台 worker

**Fat task payloads:**
- Issue: `task_queue.inputData` / `outputData` 承载大 JSON 甚至 base64
- Why: 直接复用任务表做输入输出透传，实现简单
- Impact: SQLite 行膨胀、查询变慢、轮询接口体积过大、Windows IO 压力升高
- Fix approach: 任务表只保留轻量元数据，大内容改存文件或独立结果记录

## Known Bugs

**后台任务依赖页面触发:**
- Symptoms: 任务入队后如果没有持续触发 worker，请求推进会不稳定
- Trigger: 页面关闭、窗口退出、未触发 `/api/tasks/worker`
- Workaround: 依赖启动恢复逻辑或再次打开页面触发
- Root cause: 没有独立常驻 worker

**worker 失败没有稳定前端提示:**
- Symptoms: 用户能在日志或历史页看到任务失败，但当前界面没有即时失败提示
- Trigger: worker POST 触发失败、后台任务不是当前 `activeTasks`、任务处于重试中但未最终 `FAILED`
- Workaround: 手动打开历史页或任务统计查看失败数量
- Root cause: 失败 toast 只存在于 `src/hooks/useTaskPolling.ts` 的活跃任务轮询链路，`triggerWorker()` 失败只写 console，不做 UI 反馈

**Windows 更新/重装会清理用户数据:**
- Symptoms: 重装或安装版更新后数据库、历史和配置可能丢失
- Trigger: 执行 NSIS 安装或卸载流程
- Workaround: 手工备份 `userData` 目录
- Root cause: `build/installer.nsh` 在 `customInstall` 和 `customUnInstall` 中主动删除 `APPDATA/LOCALAPPDATA/PROFILE/ImagineThis`

**批量处理统计与参数失真:**
- Symptoms: `processBatch()` 返回的 `processedCount` 不准确，`maxRounds` 形参无效
- Trigger: 调用批量 worker 路径
- Workaround: 暂无，仅靠日志观察
- Root cause: `totalProcessed` 未累加，内部 `const maxRounds = 10` 覆盖参数

## Security Considerations

**桌面端默认 secret 与本地文件存储:**
- Risk: `NEXTAUTH_SECRET` 在桌面端由主进程硬编码默认值注入，本地文件和 secret store 也依赖客户端机器安全性
- Current mitigation: 桌面 secret store 与本地路径隔离
- Recommendations: 逐步减少硬编码默认值，明确桌面端凭据生命周期与加密边界

**任务输入输出含敏感上下文:**
- Risk: 大 JSON 中可能包含图片 base64、用户配置衍生数据与 provider 参数
- Current mitigation: 主要靠本地数据库隔离
- Recommendations: 把任务表最小化，避免敏感大对象长期驻留数据库

## Performance Bottlenecks

**`/api/tasks` 轮询链路:**
- Problem: 轮询状态时仍返回 `inputData`, `outputData`, relation 和统计查询
- Measurement: 代码层面确认同一请求承担了列表页和轮询两种职责，属于结构性过载
- Cause: 未拆出轻量状态接口
- Improvement path: 新增专门的 status endpoint，ids 查询时禁用 count/groupBy 和大字段

**失败提示链路:**
- Problem: worker 执行失败并不总能即时反馈给用户
- Measurement: `triggerWorker()` 失败仅 `console.error`，而失败 toast 只覆盖 `activeTasks` 轮询结果
- Cause: 缺少全局失败通知和后台任务状态桥接
- Improvement path: 把 worker 触发失败、任务最终失败和重试耗尽都映射为统一前端通知

**Electron 启动链路:**
- Problem: 启动时数据库准备、子进程拉起、warmup API、同步日志写盘都在主路径上
- Measurement: `bootstrapApplication()` 串行执行多个耗时步骤
- Cause: 运行时初始化职责过重
- Improvement path: 压缩同步路径，延后非关键 warmup，减少同步文件 IO

**Windows 本地 SQLite / 文件系统:**
- Problem: 高轮询 + 高频任务更新 + 本地文件读写容易在 Windows 上被进一步放大
- Measurement: 未见 `WAL`, `busy_timeout`, `synchronous` 等优化配置
- Cause: 桌面 SQLite 调优缺失
- Improvement path: 引入 PRAGMA 调优与写路径减负

## Fragile Areas

**`electron/main.js`:**
- Why fragile: 同时承担环境注入、数据库初始化、子进程生命周期、窗口恢复、自动更新
- Common failures: 任一启动环节超时都可能表现为“应用慢”或“应用没起来”
- Safe modification: 先拆职责，再补启动链路日志和验证
- Test coverage: 缺乏自动化覆盖

**`build/installer.nsh`:**
- Why fragile: 安装和卸载脚本直接操作用户数据目录
- Common failures: 更新安装时误删数据库和配置
- Safe modification: 先去掉默认清理，再把“清数据”改成显式用户选择
- Test coverage: 缺乏安装/升级数据保留回归验证

**`src/app/api/tasks/worker/route.ts`:**
- Why fragile: 文件很长，混合调度、并发控制、provider 分发、状态更新
- Common failures: 任务状态推进错乱、重试逻辑难验证、局部改动易引入回归
- Safe modification: 优先拆成调度层 + provider 执行层 + 持久化层
- Test coverage: 缺乏自动化覆盖

## Scaling Limits

**SQLite task queue:**
- Current capacity: 适合轻量单用户桌面任务，但不适合继续让大 payload 高频读写
- Limit: 任务量、结果体积和轮询频率一起升高时，延迟会快速放大
- Symptoms at limit: 列表慢、状态慢、UI 卡顿、Windows 端更明显
- Scaling path: 队列表轻量化、结果分离、状态接口专用化、必要时独立 worker storage path

## Dependencies at Risk

**Electron + Next standalone coupling:**
- Risk: 桌面启动强依赖 standalone 产物完整、环境变量注入正确、子进程可用
- Impact: 打包和运行时任何缺件都会直接影响桌面可用性
- Migration plan: 保持当前方案，但提升构建验证、启动验证和 runtime 观测能力

## Missing Critical Features

**后台常驻任务调度器:**
- Problem: 当前没有真正后台持续消费队列的机制
- Current workaround: 页面触发或启动恢复触发 worker
- Blocks: 稳定后台运行、窗口关闭后继续处理、性能治理闭环
- Implementation complexity: 中等

**性能观测基线:**
- Problem: 当前更多是体感慢，没有接口耗时和 payload 大小基线
- Current workaround: 读代码、看日志、手工观察
- Blocks: 无法量化优化收益
- Implementation complexity: 低到中

## Test Coverage Gaps

**桌面 runtime 与任务链路:**
- What's not tested: 主进程启动、worker 持续消费、窗口关闭后的任务连续性
- Risk: 改动后容易引入隐性回归
- Priority: High
- Difficulty to test: 需要桌面集成测试或半自动 smoke

**任务接口负载控制:**
- What's not tested: `/api/tasks` 返回字段、状态查询耗时和 payload 控制
- Risk: 接口瘦身后可能影响历史页、浮动任务按钮、工作区轮询
- Priority: High
- Difficulty to test: 中等

---
*Concerns audit: 2026-05-26*
*Update as issues are fixed or new ones discovered*
