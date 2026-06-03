# Codebase Concerns

**Analysis Date:** 2026-06-03

## Highest-Risk Areas

**Task worker lifecycle**
- Issue：任务消费仍挂在 `/api/tasks/worker`，靠页面、恢复逻辑或手动请求触发。
- Impact：窗口关闭、页面不轮询、请求中断时，后台连续性不稳定。
- Better Shape：Electron 主进程或独立 worker 进程维护常驻消费循环，API 只负责入队和状态查询。

**Fat task payloads**
- Issue：`task_queue.inputData` / `outputData` 是 JSON 字符串，容易承载过大的图片、base64、provider 响应或复杂对象。
- Impact：SQLite 行变大、轮询变慢、Windows 本地 IO 压力上升。
- Better Shape：任务表只保留轻量索引和状态，大对象落文件或结果表。

**Worker complexity**
- Issue：`src/app/api/tasks/worker/route.ts` 文件很长，混合并发控制、任务领取、任务执行、provider 分发、结果持久化和重试。
- Impact：局部改动成本高，状态回归难以预测。
- Better Shape：拆成调度层、执行层、结果层、重试策略层。

**Desktop runtime coupling**
- Issue：Electron 启动依赖数据库准备、Next standalone、环境变量、Prisma、sharp 和文件路径全部正确。
- Impact：任何一个资源缺失都会表现为桌面启动慢、白屏或服务不可用。
- Better Shape：更强的打包前/打包后验证，以及更清晰的启动阶段日志。

## Product/Architecture Drift

**旧工作区与新商品视觉工作台并存**
- Evidence：README 和历史规划仍描述“一键增强/背景/扩图/高清/水印/视频”的旧工作区模式；当前页面入口已经出现 `/workspace/scene`、`/combo`、`/tools` 等新电商视觉工作台形态。
- Risk：需求、README、规划和实际页面不完全一致，后续开发容易接错入口。
- Suggested Fix：明确当前产品主线：旧 AI 工具箱是基础能力，新场景工作区是商品视觉生产主路径。

**组件归属分裂**
- Evidence：`components/workspace`、`components/workbench`、`features/workspace` 同时存在。
- Risk：新组件放置不一致，状态和样式重复。
- Suggested Fix：按“产品工作台”和“通用工具能力”重新划边界。

## Known Functional Risks

**Unsupported task type mismatch**
- Issue：部分页面可能提交 `SCENE_GENERATION`、`UPSCALE`、`OUTPAINT` 等任务类型，而 worker 主分发主要识别 `ONE_CLICK_WORKFLOW`、`BACKGROUND_REMOVAL`、`IMAGE_EXPANSION`、`IMAGE_UPSCALING`、`WATERMARK`、`VIDEO_GENERATION`。
- Impact：组合工作流类页面可能创建出 worker 不支持的任务。
- Suggested Fix：统一任务类型字典，前端、API、worker、Prisma 注释共用同一套常量。

**Failure feedback gap**
- Issue：worker 失败和任务最终失败未必都能在当前页面即时提醒。
- Impact：用户只能去任务中心或日志里确认失败。
- Suggested Fix：建立统一任务失败通知通道，把重试耗尽、worker 触发失败和活跃任务失败都映射为用户可见提示。

**Provider config ambiguity**
- Issue：GPT、Qwen、Jimeng Legacy/Ark、图床之间存在复用和条件依赖。
- Impact：用户配置看似完整但任务仍失败时，排查成本高。
- Suggested Fix：设置页增加配置健康检查，按 provider 给出“可用/缺什么/当前使用模式”。

## Security & Data Risks

**Secrets in local database**
- Risk：AI API Key、图床 token 等存在用户数据库或桌面 secret store。
- Current Mitigation：桌面本地隔离、部分 secret store。
- Gap：仍需明确加密边界、导出/备份策略和日志脱敏规则。

**Large sensitive task data**
- Risk：任务 JSON 可能包含图片、路径、prompt、provider 参数和结果 URL。
- Suggested Fix：任务 payload 瘦身，并避免日志输出完整输入输出。

**Local file exposure**
- Risk：`/api/files/[...path]` 类接口需要严格限制访问根目录，避免任意文件读取。
- Suggested Fix：持续检查路径归一化、根目录约束和 MIME 返回策略。

## Performance Bottlenecks

**Polling payload**
- Issue：任务列表和状态轮询容易混用。
- Impact：轮询频率高时会拖慢 SQLite 和前端渲染。
- Suggested Fix：保留轻量 `/api/tasks/status` 查询，只返回状态、进度、错误和结果摘要。

**SQLite write pressure**
- Issue：任务进度频繁更新 + 大 JSON 写入 + 本地文件 IO。
- Impact：Windows 桌面端更容易卡顿。
- Suggested Fix：减少进度写频率、启用合理 PRAGMA、分离大对象。

**Startup critical path**
- Issue：Electron 启动流程串联多个耗时步骤。
- Impact：冷启动体验波动。
- Suggested Fix：延迟非关键 warmup，明确健康检查阶段，减少同步 IO。

## Testing Gaps That Matter

- worker 状态推进无自动化保护。
- provider adapter 无 mock 测试。
- 本地文件访问和 URL 转换无系统测试。
- Electron 打包后启动 smoke 不固定。
- Windows 安装/升级数据保留缺少回归验证。

## Refactor Priorities

1. 统一任务类型与任务状态字典。
2. 拆分 worker，先把“分发/执行/持久化/重试”分开。
3. 给任务状态轮询建立轻量契约。
4. 明确新旧工作区的产品边界和路由入口。
5. 为 provider 配置做健康检查。
6. 建立最小测试保护：任务、storage、provider mock、桌面 smoke。

---
*Update as risks are resolved, new runtime evidence appears, or product direction changes.*