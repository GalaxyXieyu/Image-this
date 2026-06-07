---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: In progress
stopped_at: "Completed Phase 5: Workflow API and Worker Contract Refactor"
last_updated: "2026-06-07T15:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 12
  completed_plans: 11
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-27)

**Core value:** 电商卖家和运营可以用一个稳定、清晰、批量友好的 AI 工作台，快速产出商品主图、场景图、背景图、水印图、高清图和视频素材。

**Current focus:** Phase 5 — Workflow API and Worker Contract Refactor

## Current Position

Phase: 5 of 6 (pending)
Plan: TBD after Phase 4 completion

## Accumulated Context

### Decisions

- [2026-05-27]: 以 Pencil 设计稿 `/Users/galaxyxieyu/Documents/image-this.pen` 作为新版产品和信息架构基准。
- [2026-05-27]: 旧前端基本不作为兼容目标；在新流程验证后可以删除。
- [2026-05-27]: 保留 main 分支的桌面 runtime、任务瘦身、输入资产引用和日志诊断优化作为工程基线。
- [2026-05-27]: 新任务链路必须 typed contract 化，避免继续扩散任意 `inputData` JSON。
- [2026-05-27]: 先做 foundation，再做模板库、场景图工作流、智能工具箱、API/worker 收敛和旧前端删除。
- [2026-05-27]: 模板库使用静态 seed 数据，DB 迁移推迟到 Phase 5+。
- [2026-05-27]: VideoParams 加入 ToolParameters union 以支持视频预设。
- [2026-06-05]: Phase 3 聚焦把 `/workspace/scene` 从三步 UI 原型推进为真实任务闭环；完整 worker/API contract 重构保留到 Phase 5。
- [2026-06-05]: 在执行 Wave 2 前，需要选择性合入 `main` 分支中和模型调用、模型列表获取、provider 配置兼容相关的调整，避免 scene task adapter 绑定过期模型契约。
- [2026-06-05]: 已执行 Phase 3 Checkpoint 0，选择性合入 `/api/models` 模型发现行为、Gemini fallback 模型列表、OpenAI-compatible `toapis.com` 兼容，以及 worker 结果记录 URL 稳定化；未做整支 `main` merge。
- [2026-06-05]: 已为新旧任务类型、workflowType 和状态名建立兼容名称边界；scene generation 在当前阶段继续通过 legacy `BACKGROUND_REMOVAL` worker 分支入队，但 UI、轮询和任务中心按 `scene_generation` 业务语义展示。
- [2026-06-05]: Phase 3 Wave 3 已接入轻量 `/api/tasks/status` 轮询，候选卡片状态来自真实任务摘要；真实 provider 端到端结果仍需手动 smoke 验证后才能进入业务验收。
- [2026-06-06]: Phase 3 Wave 4 已完成候选结果保存到 `/results` 的最小闭环；`npm run build` 通过。真实 provider smoke 与 Electron/Windows 回归留作发布前/Phase 6 验证。
- [2026-06-06]: Phase 4 Wave 1 已把 `/tools` 改为统一工具箱工作台骨架，支持 background/watermark/upscale/outpaint 通过 typed adapter 创建真实 `/api/tasks` 任务，并使用 `/api/tasks/status` 轮询状态；直接同步处理接口保留兼容。
- [2026-06-07]: Phase 4 Wave 2 完成工具 preset 初始化和参数覆盖：`/tools` 支持 `?preset=` 和 `?tool=` 查询参数初始化工具状态，preset 中的 asset 引用（referenceAsset、watermarkLogoAsset）正确提取到 draft。
- [2026-06-07]: Phase 4 Wave 3 完成结果保存语义：worker 已为所有 4 种工具创建 ProcessedImage 记录，`/results` 分类映射正确，工具页显示保存确认，结果页空状态提供工具箱入口，品牌导航统一。
- [2026-06-07]: Phase 4 全部完成，`npm run build` 通过，已创建 `04-01-SUMMARY.md` 和 `04-VERIFICATION.md`。
- [2026-06-06]: 已验证 GPT 图片能力可参考 `docs/brands/icon/cut/ip2-trimmed-preview.png` 生成 LUMO/IP 品牌插图候选稿；调用入口为 `/api/images-process/background-replace`，生成产物为 `public/uploads/1780740082828-bg-replace-cmq26n0if00037z7xlk1wviqd.jpg`。该能力进入 Phase 04a 首页、空状态、新手引导插图候选流程，但不能替代正式 Logo 或核心 UI 控件资产。
- [Phase 04a]: Tailwind v3 @theme blocks in imported CSS files work when entry file has @tailwind directives before @imports
- [Phase 04a]: Tailwind config must define colors in theme.extend.colors for JIT class generation even when CSS custom properties exist
- [Phase 04a]: Home page CTA kept as variant=brand (solid blue) rather than gradient — already professional and clean
- [Phase 04a]: Combo step icons unified to bg-primary-soft + text-primary — removed multi-color decorative array
- [Phase 04a]: Combo connector lines changed to bg-primary for active flow indication

### Active Canonical References

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/phases/01-product-visual-workbench-rebuild/01-CONTEXT.md`
- `.planning/phases/01-product-visual-workbench-rebuild/01-01-PLAN.md`
- `.planning/phases/01-product-visual-workbench-rebuild/01-01-SUMMARY.md`
- `.planning/phases/02-template-library-preset-model/02-CONTEXT.md`
- `.planning/phases/02-template-library-preset-model/02-01-PLAN.md`
- `.planning/phases/02-template-library-preset-model/02-01-SUMMARY.md`
- `.planning/phases/02-template-library-preset-model/02-VERIFICATION.md`
- `.planning/phases/03-scene-image-guided-workflow/03-CONTEXT.md`
- `.planning/phases/03-scene-image-guided-workflow/03-01-PLAN.md`
- `.planning/phases/03-scene-image-guided-workflow/03-01-SUMMARY.md`
- `.planning/phases/03-scene-image-guided-workflow/03-VERIFICATION.md`
- `.planning/phases/04-unified-smart-toolbox/04-CONTEXT.md`
- `.planning/phases/04-unified-smart-toolbox/04-01-PLAN.md`
- `.planning/phases/04-unified-smart-toolbox/04-01-SUMMARY.md`
- `.planning/phases/04-unified-smart-toolbox/04-VERIFICATION.md`
- `/Users/galaxyxieyu/Documents/image-this.pen`
- `src/app/workspace/scene/page.tsx`
- `src/app/tools/page.tsx`
- `src/app/templates/page.tsx`
- `src/lib/workbench/presets.ts`
- `src/lib/workbench/api-contract.ts`
- `src/lib/workbench/tool-task-adapter.ts`
- `src/lib/workbench/task-compat.ts`
- `src/hooks/workbench/useWorkflowTaskPolling.ts`
- `src/app/api/tasks/route.ts`
- `src/app/api/tasks/status/route.ts`
- `src/app/api/tasks/worker/route.ts`
- `prisma/schema.prisma`

### Historical Baseline

Historical baseline phases (01-desktop-runtime-performance, 02-task-input-asset-references, 03-app-log-observability) have been archived and removed from active planning. Engineering context remains in git history.

### Pending Todos

- [x] Execute Phase 1 foundation plan.
- [x] Plan and execute Phase 2: Template Library and Preset Model.
- [x] Create Phase 3 context and first execution plan.
- [x] Execute Phase 3 Wave 1: scene draft and preset initialization.
- [x] Execute Phase 3 Checkpoint 0: selectively sync model-call/model-list changes from `main`.
- [x] Execute Phase 3 Wave 2: input assets and task submission adapter.
- [x] Execute Phase 3 Wave 3: lightweight polling and candidate result state.
- [x] Execute Phase 3 Wave 4: result save, integration checks, and phase closeout.
- [x] Create Phase 4 context and first execution plan.
- [x] Execute Phase 4 Wave 1: toolbox shell and task-based execution.
- [x] Execute Phase 4 Wave 2: tool preset initialization and parameter coverage.
- [x] Execute Phase 4 Wave 3: result save semantics and phase closeout.
- [x] Create Phase 4 summary and verification documents.
- [ ] Create Phase 5 context and execution plan.
- [ ] Validate Windows/Electron baseline after scene workflow implementation.
- [ ] Validate Windows/Electron baseline after scene workflow implementation.

### Blockers/Concerns

- `src/app/workspace/page.tsx` is large and behavior-heavy; deletion should wait until replacement flows exist (Phase 6).
- Existing task queue still stores JSON strings; Phase 4 uses adapter boundaries, while full typed worker/API refactor remains Phase 5.
- `/tools` now creates real compatibility tasks for background replace, watermark, upscale, and outpaint, and uses lightweight status polling for task/result visibility; provider-backed completion still depends on local credentials and worker runtime.
- `src/app/api/tasks/worker/route.ts` is high-risk because it mixes scheduling, execution, provider dispatch, persistence, and retry behavior.
- Worker lifecycle currently depends on `/api/tasks/worker` being triggered; do not assume a true always-on background worker.
- `npm run build` passed on 2026-06-07 after Phase 04a Wave 3. Remaining warnings are dependency freshness notices and existing `<img>` lint performance warnings in preview surfaces.

## Session Continuity

Last session: 2026-06-07T02:00:40.698Z
Stopped at: Completed 04a-04 Wave 4: Brand Expression and Screenshot Review
Resume file: None
