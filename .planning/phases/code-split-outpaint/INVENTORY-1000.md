# Inventory: src 超 1000 行源码盘点（更新）

扫描时间：2026-07-22（split 中后复扫）  
阈值：≥1000 必须处理；800–999 观察  

## 当前 ≥1000 行（残留）

| 优先级 | 文件 | 当前行数 | 基线 | 状态 / 处理结论 |
|--------|------|----------|------|-----------------|
| P0 | `src/app/combo/page.tsx` | ~1676 | 3144 | **已大幅拆分** → `components/combo/*`（types/canvas-plan/Global*/step-*/form-controls/layout-bits/normalize-step/template-data）；page 仍编排+移动/桌面 UI，可继续拆工作区 JSX |
| P0 | `src/app/api/tasks/worker/route.ts` | ~1444 | 1528 | **安全抽离完成** → `lib/workbench/task-asset-utils.ts`；调度/claim/fence **豁免整包重写**（见 WORKER-SPLIT-EVAL.md） |
| P1 | `src/app/settings/page.tsx` | ~1581 | 1969 | **部分拆分** → model-select / SettingsModelsSection / SettingsSystemSections；prompts+dialogs 仍在 page，可后续专项 |

## 已压到 <1000（本目标达标）

| 文件 | 当前行数 | 基线 | 去向 |
|------|----------|------|------|
| `src/app/workspace/scene/page.tsx` | ~105 | 1812 | `components/scene/*` |
| `src/app/results/page.tsx` | ~934 | 1186 | `components/results/*` |
| `src/app/tools/page.tsx` | ~923 | 1062 | `components/tools/watermark-editor.tsx` |

## 800–999 观察

| 文件 | 行数 |
|------|------|
| `src/app/workspace/listing-set/page.tsx` | 928 |

## 复用模块清单（新建）

### combo
- `types.ts` / `canvas-plan.ts` / `form-controls.tsx` / `CanvasPlanPreview.tsx`
- `GlobalQuickBar.tsx` / `GlobalSettingsPanel.tsx` / `layout-bits.tsx`
- `step-meta.ts` / `step-params.tsx` / `step-panels.tsx` / `normalize-step.ts` / `template-data.ts`

### scene
- `types-and-helpers.tsx` / `use-scene-generation.ts` / `scene-preview-bits.tsx`
- `scene-product-forms.tsx` / `scene-results.tsx` / `scene-workspace.tsx` / barrels

### results / tools / settings / worker
- `results-helpers.tsx` / `ResultsLightbox.tsx`
- `tools/watermark-editor.tsx`
- `settings/model-select.tsx` / `SettingsModelsSection.tsx` / `SettingsSystemSections.tsx`
- `lib/workbench/task-asset-utils.ts`

## worker 豁免理由
见 `WORKER-SPLIT-EVAL.md`：仅安全抽离资产工具；不重写 claim/retry/fence。

## 扩图修复（并行完成）
- MediaKit expand 冒烟通过（0.4 四周尺寸放大）
- pipeline：`normalizeOutpaintRatioPercent`、stepParams 回退、扩后尺寸校验、`stepTraces`
- 提交：`0a8abe6`

## 建议后续（非本目标阻塞）
1. combo 桌面/移动工作区 JSX 继续外提  
2. settings prompts+dialogs 外提  
3. worker legacy process* → 与 handler registry 收敛（专项）  
