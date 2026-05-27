# Requirements: AI Product Visual Workbench Rebuild

**Core Value:** 电商卖家和运营可以用一个稳定、清晰、批量友好的 AI 工作台，快速产出商品主图、场景图、背景图、水印图、高清图和视频素材。

## Active Requirements

### WB-01 - New Workbench App Shell

应用必须提供符合 Pencil 设计稿的新导航、顶部栏、侧栏、工作区、详情面板、步骤条和操作栏。Route page 应保持轻量，复杂状态放到 feature 模块。

### WB-02 - Template Library

模板库必须支持分类侧栏、模板网格、搜索/筛选、详情面板和“使用模板进入工作流”。模板数据需要能表达场景预设、工具预设和提示词/workflow 参数。

### WB-03 - Scene Image Guided Workflow

场景图流程必须覆盖商品信息/素材收集、候选生成、结果调整三个阶段，并支持单图和批量生成。

### WB-04 - Unified Smart Toolbox

AI 换背景、加水印、高清化、扩图等能力必须运行在统一编辑器 shell 中，共享上传、参数、画布、结果、任务状态和批量交互模式。

### WB-05 - Typed Workflow API Contract

新版任务提交必须从松散 `type + inputData string` 收敛为 typed workflow contract。迁移期可以保留 `/api/tasks` adapter，但新前端不应直接拼任意 JSON 字符串。

### WB-06 - Lightweight Task and Batch UX

任务轮询、批量状态、失败重试、结果预览和结果元数据必须通过轻量接口驱动。不得重新把大图/base64 放进状态查询链路。

### WB-07 - Data Model for Presets and Runs

数据层需要支持模板/预设、workflow run、batch group、生成资产和工具运行元数据。优先复用 `TaskQueue`、`ProcessedImage`、`PromptTemplate`、`Project`，必要时增量扩展。

### WB-08 - Old Frontend Removal

新版核心流程验证后，旧 workspace tab 组件、旧 tab store 和不再使用的 hook 应删除或归档，避免两套产品同时维护。

### WB-09 - Desktop Baseline Preservation

Electron runtime、Windows 数据安全、输入资产引用、任务接口瘦身、日志诊断等 main 分支优化必须继续有效。

## Non-Requirements

- 本轮不新增模型供应商。
- 本轮不引入独立后端服务或外部队列系统。
- 本轮不建设模板 marketplace 或多人协作。
- 本轮不要求旧工作台视觉兼容。

## Acceptance Criteria

- 新 app shell 可承载模板库、场景工作流和智能工具箱页面。
- 模板库能展示、筛选、查看详情并进入对应工作流。
- 场景图三步流程可以提交任务、查看候选结果并进入调整页。
- 智能工具箱至少覆盖 AI 换背景、加水印、高清化三个可执行工具。
- 新任务提交走 typed contract 或 adapter，轮询走轻量状态接口。
- 旧设置、历史、任务中心和 Electron 桌面能力仍可访问。
- `npm run build` 通过。

