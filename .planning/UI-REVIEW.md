# UI Review Report — ImageThis 品牌/UI 基线审查

**Date:** 2026-06-06  
**Scope:** `docs/brand-ui-spec.md`、`public/brands/`、新版工作台 GSD 文档  
**Method:** 品牌资产检查 + 现有 UI 规范比对 + 产品工作台页面风险审查

---

## 1. 最新判断

当前 UI 问题不是单个页面不好看，而是品牌规范没有把“Logo/IP/颜色/渐变/页面组合”写成可执行约束，导致后续页面容易各自发挥。

最新规范已收敛到：

```text
专业电商工作台 × 蓝紫 AI 光感 × 克制 IP 陪伴
```

对应品牌规范：`docs/brand-ui-spec.md`

---

## 2. 品牌规范修正结果

| 项目 | 旧状态 | 新基线 |
|---|---|---|
| 主色 | `#0066FF`、`#6366F1`、粉橙绿黄并列，层级不清 | `#2563FF` 为主色，`#7C3AED` 为 AI 延展 |
| 强调色 | 霓虹粉、活力橙存在主色化风险 | 粉/橙只用于活动、促销、转化提醒 |
| Logo | 只有基础规则，没有说明当前资产实际是深色单色逻辑 | Logo 本体保持深色/白色/单色，渐变只放背景/容器 |
| IP | LUMO 使用边界不清 | 只用于欢迎、引导、空状态、加载；不进入核心编辑画布 |
| 渐变 | 多色渐变容易泛用 | 主渐变只保留蓝紫；暖色渐变仅活动场景 |
| 页面规则 | 有场景，但没有强约束 | 按首页、工作台、工具箱、任务、结果、设置拆分使用边界 |

---

## 3. 页面级风险基线

| Page | 当前风险 | 新规范要求 | 优先级 |
|---|---|---|---|
| `/` 首页 | 可能过度使用 IP、星光、渐变，变成活动页 | 允许品牌表现，但只保留一个强主视觉；Logo + 主口号清晰 | P1 |
| `/workspace/scene` | 生成流程可能被装饰分散注意力 | 三步流程、候选结果、生成 CTA 优先；蓝色选中，紫色只标记 AI | P0 |
| `/tools` | 工具箱容易做成表单页或炫技页 | 专业编辑器结构；上传、参数、画布、结果是主线 | P0 |
| `/templates` | 选中态、分类、预览图可能色彩漂移 | 图片预览优先，选中态使用蓝边 + 淡蓝/淡紫底 | P1 |
| `/tasks` | 状态色可能与品牌色混用 | 状态语义优先：成功绿、警告黄、失败红、处理中蓝 | P0 |
| `/results` | 操作按钮可能压过图片资产 | 图片墙优先，操作后置，hover 显示快捷动作 | P1 |
| `/settings` | 如果使用 IP/强光效会降低可信感 | 中性色 + 蓝色链接，少装饰 | P1 |
| `/combo` | 多步骤流程可能色彩过多 | 蓝色为流程主线，功能状态色只表达状态 | P1 |

---

## 4. 组件级风险基线

| 组件 | 风险 | 统一规则 |
|---|---|---|
| 主按钮 | 粉橙渐变抢占主 CTA | 默认蓝色；生成类按钮可蓝紫渐变 |
| 卡片 | 多色边框、多阴影、多背景 | 白底、浅边框、轻阴影；选中态蓝边 |
| 标签 | 高饱和标签堆满页面 | 浅底深字；AI 标签淡紫，状态标签按语义色 |
| 进度 | 彩虹或多色进度 | 普通任务蓝色；AI 生成可蓝紫过渡 |
| 空状态 | 吉祥物过大、文案泛 | LUMO 小尺寸陪伴，文案直接给下一步 |
| Logo | 被改色、加阴影、拉伸 | 只使用资产目录，按安全区和尺寸规则 |
| 渐变背景 | 每页都用大渐变 | 首页/生成态/模板强调可用，表单和设置页不用 |

---

## 5. 对当前 GSD 主线的影响

当前主线仍是 Phase 4 `Unified Smart Toolbox`，但需要插入一条轻量品牌/UI 规范落地计划，作为 Phase 4 后续 Wave 和 Phase 5 前的设计基线。

建议新增：

```text
04a-brand-ui-ux-optimization
```

边界：

- 不重构业务接口。
- 不改变任务队列和 worker 合约。
- 只收敛 UI token、品牌资产使用、页面视觉组合、组件状态语义。
- 优先修正 `/workspace/scene`、`/tools`、`/tasks` 这三个高频工作台页面。

---

## 6. 最新 UI/UX 验收标准

一轮 UI 改造完成后，需要满足：

1. 主 CTA、链接、选中态统一使用 `#2563FF`。
2. AI 生成、模板、智能能力统一使用 `#7C3AED` 或淡紫底。
3. 暖色不再作为普通主按钮或常规高亮。
4. Logo 不被改色、拉伸、加重阴影。
5. LUMO 不出现在核心图片判断区域。
6. GPT 生成插图必须参考正式 IP 资产，不能直接替换 Logo 或核心 UI 资产。
7. `/workspace/scene` 和 `/tools` 的操作主线比装饰更明显。
8. `/tasks` 状态颜色只表达状态，不表达品牌装饰。
9. `/results` 以图片资产为第一视觉优先级。
10. 浅色模式是默认工作台基线。
11. 同一屏只有一个最强视觉焦点。

---

## 7. GPT 品牌插图能力验证

| 项目 | 结果 |
|---|---|
| 参考 IP | `public/brands/ip/lumo-helper-front.png` |
| Provider | GPT |
| 模型配置 | `gpt-image-1` |
| 调用入口 | `/api/images-process/background-replace` |
| 验证状态 | Passed |
| 生成产物 | `public/uploads/1780740082828-bg-replace-cmq26n0if00037z7xlk1wviqd.jpg` |

判断：项目已经具备“参考 LUMO/IP 生成品牌插图”的能力。后续首页、空状态、新手引导、功能卡片可进入候选稿生产，但核心工作台画布、设置页和 Logo 不能使用生成插图替代正式资产。

---

## 8. 当前结论

**Status:** Needs UI/UX alignment pass

| Area | Status |
|---|---|
| 品牌规范 | Updated |
| Logo 使用规则 | Updated |
| 色彩体系 | Updated |
| IP 使用边界 | Updated |
| GPT 品牌插图能力 | Verified |
| 页面级落地计划 | Planned |
| 实际页面改造 | Pending |

---

# Phase 04a Brand UI/UX Optimization Review

## Date: 2026-06-07

## Scope
- Wave 1: Token and component baseline
- Wave 2: Core workbench pages (/workspace/scene, /tools, /tasks)
- Wave 3: Asset-first supporting pages (/results, /templates, /settings)
- Wave 4: Brand expression (/home, /combo)

## Token Architecture
```
src/styles/
├── design-system/tokens.css    # Generic: primary, ai, status, neutral
├── domains/workbench.css       # Domain: wb-surface, wb-text, layout
└── utilities/brand.css         # Gradients
```

## Color Compliance Check

| Page | Primary CTA | AI Accent | Status Colors | LUMO Usage | Verdict |
|------|-------------|-----------|---------------|------------|---------|
| / | Blue (brand variant) | Not used | N/A | Not present | PASS |
| /workspace/scene | Blue | Violet for AI gen | Semantic | Not in canvas | PASS |
| /tools | Blue | Violet for AI gen | Semantic | Not in canvas | PASS |
| /tasks | Blue | N/A | Semantic | Not present | PASS |
| /results | Blue | N/A | N/A | Simple empty state | PASS |
| /templates | Blue | Violet for AI templates | N/A | Not present | PASS |
| /settings | Blue | N/A | N/A | Not present | PASS |
| /combo | Blue | N/A | Semantic | Not present | PASS |

## Component Inventory

| Component | Variants Added |
|-----------|---------------|
| Button | brand, ai, gradient, xs |
| Badge | ai, success, warning, danger, processing |

## Hardcoded Color Removal

| Color | Before | After |
|-------|--------|-------|
| #0066FF | 29 instances in 8 files | 0 |
| #0052CC | 10 instances in 5 files | 0 |
| #999999 | 1 instance | 0 |
| #666666 | 1 instance | 0 |
| #2563eb | 2 instances | 0 |
| emerald-50/emerald-600 | 1 instance (combo STEP_META) | 0 |
| violet-50/violet-600 | 1 instance (combo STEP_META) | 0 |
| amber-50/amber-600 | 1 instance (combo STEP_META) | 0 |
| sky-50/sky-600 | 1 instance (combo STEP_META) | 0 |
| rose-50/rose-600 | 1 instance (combo STEP_META) | 0 |

## Wave 4 Changes

### /page.tsx (Home)
- No changes required — already compliant from Waves 1-3
- CTA uses `variant="brand"` (solid blue) — acceptable per spec; gradient is optional for home page
- Trust icons: `text-primary` — correct
- Quick action icons: `text-primary` on `bg-muted` circles — correct
- Case study cards: white with subtle border — correct
- One strong visual focal point (Hero section) — correct
- Color count: blue (primary) only; no stray decorative colors

### /combo/page.tsx (Combo Flow)
- **STEP_META colors**: Changed from multi-color (emerald/violet/amber/sky/rose) to unified `bg-primary-soft text-primary` for all step types
- **Connector lines**: Changed from `bg-border` to `bg-primary` for active flow indication
- Action buttons: `variant="brand"` for primary, `variant="outline"` for secondary — correct
- Template cards: `border-primary ring-primary` for selected — correct
- Resolution buttons: `border-primary bg-primary/5 text-primary` for selected — correct

## Build Status
- npm run build: PASS
- npx tsc --noEmit: PASS

---

# UI/UX Test Pipeline Addition

## Date: 2026-06-09

## Purpose

新增一条可复用的 UI/UX 测试闭环，用于覆盖“登录 → 场景工作台 → 上传商品图/参考图 → 选择模板 → 提交生成图片任务”。

## Commands

```bash
npm run test:uiux
npm run test:uiux:login-generate
npm run test:uiux:record:opencli
npm run test:uiux:codegen
```

## Artifact Contract

每轮输出到：`out/ui-ux-plan/<run-id>/`

- `01_scope.csv`
- `02_coverage_matrix.csv`
- `03_test_cases.csv`
- `04_execution_log.csv`
- `05_bug_list.csv`
- `06_summary.csv`
- `screenshots/`
- `traces/`
- `recordings/`
- `opencli/`
- `network.json`
- `step-log.jsonl`
- `ui-ux-test-report-<run-id>.md`

## Tool Boundary

- Playwright `codegen` 是“操作一次 → 导出脚本 → 删除错误步骤 → 沉淀复跑”的主入口，录制产物保存在 `recordings/`。
- `opencli` 用于探索录制和 API/network candidates，不作为默认复跑入口。
- `chrome-mcp` 保留为视觉/体验探索入口；发现项必须落到 `04_execution_log.csv`、`05_bug_list.csv` 和截图证据路径。
- `npm run test:uiux` 用于稳定复跑和报告生成。
- 真实出图依赖本地 provider 凭据；如果缺少凭据，结果图 case 记为 `BLOCKED/ENV`，不伪造 PASS。