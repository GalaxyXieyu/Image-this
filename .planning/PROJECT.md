# Image This AI Product Visual Workbench

## What This Is

Image This 正在从传统多 Tab 图片处理工具，重构为面向电商卖家的 AI 商品视觉生产工作台。新版以 Pencil 设计稿 `/Users/galaxyxieyu/Documents/image-this.pen` 为产品与交互基准，围绕“上传商品 → 选择模板/场景 → 生成可上架素材 → 调整与批量导出”的工作流重建前端和接口契约。

当前仓库仍是 Next.js 15 + React 19 + Electron + Prisma + SQLite 的全栈应用。上一轮 main 分支已经完成了一批桌面运行时、任务队列、输入资产引用和日志可观测性优化；这些成果是新版重构的工程基线，而不是当前 GSD 主线。

## Core Value

电商卖家和运营可以用一个稳定、清晰、批量友好的 AI 工作台，快速产出商品主图、场景图、背景图、水印图、高清图和视频素材。

## Current Product Direction

新版信息架构以设计稿为准：

- **首页**：把产品定位为专业 AI 商品视觉工作台。
- **模板库**：提供场景/工具/提示词预设，支持分类、预览、详情和一键进入工作流。
- **场景图工作区**：围绕商品信息、素材上传、生成候选、调整结果形成三步流程。
- **智能工具箱**：统一承载 AI 换背景、加水印、高清化、扩图等单工具能力。
- **批量生产**：批量开关、批量任务状态和批量结果管理应成为核心能力。

## Requirements

### Validated Baseline

- ✓ 桌面端 Electron + Next.js 应用已存在。
- ✓ 用户认证、AI provider 配置、本地/图床存储、任务队列、历史记录等后端能力已存在。
- ✓ main 分支已引入任务状态瘦身、输入资产引用、后台 worker/runtime、日志诊断等优化。
- ✓ 设计稿已明确新版页面结构：`首页`、`模板库`、`场景图工作区`、`场景图生成`、`生成并调整`、`智能工具箱`、`加水印`、`AI换背景`。

### Validated

- [x] **Phase 1 (2026-05-27)**: 新版 app shell、导航、页面路由和布局组件以 Pencil 设计稿为基准重建 — 7 个可复用布局原语 + 8 个新路由。
- [x] **Phase 1 (2026-05-27)**: 任务提交 API typed workflow contract 草案完成 — 10 个接口 + 2 个 legacy 适配器。
- [x] **Phase 1 (2026-05-27)**: 轻量任务轮询和批量 UX 基础完成 — `useWorkflowTaskPolling` hook。
- [x] **Phase 1 (2026-05-27)**: 设置、历史、任务中心、Electron 打包和 Windows 数据安全策略继续可用 — `npm run build` 通过，旧代码未动。

### Active

- [ ] 旧 `/workspace` 巨型客户端页面应被拆分或替换，不再作为主要开发基础。
- [ ] 模板库需要成为可落地的数据与页面能力，而不是静态展示。
- [ ] 场景图工作流需要支持三步流程、批量生成、候选结果、调整和保存。
- [ ] 智能工具箱需要复用统一编辑器 shell，避免每个工具重复造页面状态。
- [ ] 任务提交 API 需要从松散 `type + inputData string` 收敛为 typed workflow contract。（contract 草案已完成，worker 适配待 Phase 5）
- [ ] 新前端必须复用已有 provider、任务队列、输入资产引用和存储优化，不回退到大 base64 传输。
- [ ] 设置、历史、任务中心、Electron 打包和 Windows 数据安全策略必须继续可用。（已验证基线未破坏）

### Out of Scope

- 本轮不重写 AI provider 底层算法与第三方模型接入。
- 本轮不切出 Prisma/SQLite 或引入独立队列服务。
- 本轮不追求模板市场/团队协作/云端多租户。
- 本轮不保留旧工作台视觉兼容性；旧前端可以在新流程验证后删除。

## Context

这是一个 brownfield 重构。现有 `src/app/workspace/page.tsx` 集中了上传、预览、任务提交、轮询、审核、水印、视频和多个 modal 状态，已经不适合作为新版工作台继续扩展。新版应采用 feature-first 结构，把 route page、布局 shell、workflow state、API contract 和 provider 调用拆开。

上一轮性能优化仍然重要：新版不能重新把大图片 base64 塞回任务 JSON，也不能让任务消费依赖页面主动触发 worker。相关 phase 文件保留在 `.planning/phases/01-desktop-runtime-performance`、`.planning/phases/02-task-input-asset-references` 和 `.planning/phases/03-app-log-observability`，作为工程基线和回归参考。

## Constraints

- **Design source**: 新 UI 和信息架构以 Pencil 文件为准。
- **Tech stack**: 保持 Next.js 15、React 19、Electron 39、Prisma、SQLite、shadcn/ui、Tailwind、Zustand。
- **Compatibility**: Auth、settings、provider credentials、local storage、history、task queue 和 Electron runtime 不能被无意破坏。
- **Performance**: 新任务链路必须沿用轻量状态查询和输入资产引用，不回退到大 JSON/base64。
- **Scope control**: 先重建产品工作流和 API 契约，再删除旧前端；删除必须在新流程验证后进行。

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 以 Pencil 设计稿作为新版产品基准 | 用户明确要求按当前设计重构，旧前端基本不需要 | Active |
| 保留后端能力，重建前端和 API contract | provider/任务/存储已有价值，问题主要在产品结构和契约松散 | Active |
| 先做 foundation，再做模板库、场景流、工具箱 | 避免直接在旧巨型 workspace 上继续叠复杂度 | Active |
| 将旧性能 GSD 作为历史基线保留 | main 已包含有效优化，重构必须继承而非覆盖 | Active |

---
*Last updated: 2026-05-27 for AI product visual workbench rebuild*
