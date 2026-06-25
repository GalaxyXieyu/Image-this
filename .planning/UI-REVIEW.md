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
---

# Round 2 — 重设计 v2.0 整站 UI/UX 验收（PM T1）

**Date:** 2026-06-25
**Method:** chrome-devtools MCP（headless Chrome，1440×900）+ 测试账号 `test@imaginethis.local`，按 `.planning/UI-REVIEW-PLAN.md` 9 屏 × 4 维度跑完，dev server `localhost:34123`。
**Screenshots:** `.planning/ui-reviews/2026-06-25/S{1..9}-*.png` + `S1-home-dark.png` + `S8-prompt-studio-run.png`。

## R2.1 验收矩阵

| # | 屏 | 截图 | A 布局 | B 视觉 token | C 交互 | D 主题 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | `/` | S1-home.png + S1-home-dark.png | PASS | PASS | PASS | PASS | Hero 衬线 46px / 紫罗兰渐变「专业视觉」/ 右侧浮动玻璃预览卡 / 01-03 三栏；暗色 `rgb(19,19,22)` 正确反色，accent 紫不变 |
| 2 | `/workspace/scene` | S2-workspace-scene.png | PASS | PASS | PASS | n/t | AppShell 双层栏（首页/工作台/图库/设置 + 场景生成/组合工作流/单点工具 active pill）✓；StepBar 紫色圆点段（**非"玻璃药丸"**）；Step1 三段 glass-panel + sticky 底部紫色「下一步」 |
| 3 | `/combo` | S3-combo.png | PASS | FLAG | PASS | n/t | 3 栏 glass + pipeline 序号紫徽标 + GripVertical ✓；左栏 6 张 LUMO 模板缩略图**复用同一只 LUMO 鸟图**（占位资源未替换）；底部「执行批量处理」是紫色实心按钮，**非设计稿要求的"悬浮玻璃药丸"** |
| 4 | `/tools` | S4-tools.png | PASS | PASS | PASS | n/t | 4 工具紫色胶囊组替代下划线 tab ✓；左中右 glass ✓；批量模式 toggle ✓；未上传时「创建工具任务」disabled |
| 5 | `/results` | S5-results.png | PASS | FLAG | PASS | n/t | 7 类分类 + 0 数字徽标 ✓；网格/列表 segmented ✓；「批量删除」红色描边 ✓；**左侧 nav 与主区域均为白底卡片，未应用 glass-panel** |
| 6 | `/tasks` | S6-tasks.png | PASS | **BLOCK** | PASS | n/t | **未迁移 brand token**：Tab 是黑色下划线（"全部 (0)" 有黑色下划线、其余黑色文字），不是紫罗兰胶囊；空状态卡片是浅灰描边方框，无 glass-panel；标题 "任务中心" 是 sans-serif 非衬线。Plan §3 明确要求 "卡片对齐 brand token" |
| 7 | `/settings` | S7-settings.png | PASS | PASS | PASS | n/t | 衬线大标题 "设置" ✓；左侧 nav 选中态紫色渐变高亮 ✓；「保存本区配置」紫色渐变 ✓；GPT/Gemini/即梦 多 provider 卡片对齐 |
| 8 | `/prompt-studio` | S8-prompt-studio.png + S8-prompt-studio-run.png | PASS | PASS | PASS | n/t | 全屏无 AppShell ✓；v3/v2/v1 版本胶囊 ✓；「运行调试」紫色渐变 CTA + 「组 1（可编辑）」紫色徽标 ✓；并发 1/2/3/4 数字徽标 ✓；点击运行 < 1s 即跳 "已完成"（**未观察到 ConicSpinner 中间态**，时间窗口太短） |
| 9 | `/auth/login` | S9-auth-login.png | PASS | **BLOCK** | PASS | n/t | 表单提交跳转 `/workspace/scene` 正常；无 AppShell（HIDDEN_PREFIXES 生效）；**左侧大块品牌色 `#2563FF` 蓝、「登录」CTA 蓝实色、「立即注册」蓝链接**——违反 Plan §3 "无任何 `border-blue-*` / 蓝色硬编码"、"主 CTA 是紫罗兰渐变（非旧蓝）" |

> 备注：D 主题列只在 S1 真实切换验证（dark-class 切换、`bg` token → `rgb(19,19,22)`、紫色 accent 不变）。S2-S8 标 n/t（not tested）以节省时间，建议在修复 F2/F3 后批量回归。

## R2.2 通用回归

- [x] 顶栏不重复（页面级 TopNav 已清理；S2-S4 双层 AppShell 是设计意图，非重复）
- [PARTIAL] `font-serif` 实际生效：Hero h1 / Settings h1 ✓；**Tasks h1、Results h1 仍为 sans-serif**
- [PARTIAL] 主 CTA 是紫罗兰渐变：S1/S2/S3/S4/S5/S7/S8 ✓；**S9 登录 CTA 是旧蓝**
- [PARTIAL] 无蓝色硬编码：S9 登录页明显违反
- [PARTIAL] Console 无报错：**S6 /tasks 抛 `获取任务数据失败: TimeoutError: signal timed out`**；其它页面无 hydration mismatch / React warning

## R2.3 待跟进事项（建议单独建子任务）

| ID | 屏 | 维度 | 严重度 | 描述 | 建议 |
|---|---|---|---|---|---|
| F1 | /tasks | C 交互 | **HIGH** | console 出现 `TimeoutError: signal timed out` —— 任务列表 fetch 超时，疑似 AbortController 超时阈值过短或 worker 接口慢 | 排查 `src/app/tasks/page.tsx` / `/api/tasks/status` 的 fetch timeout 与重试逻辑 |
| F2 | /tasks | B 视觉 | **BLOCK** | Tab 未迁移到紫罗兰胶囊；空状态卡片未应用 glass-panel；h1 非衬线 | 与 S4/tools 的胶囊 Tab、S6/tasks 的 brand 卡片对齐 |
| F3 | /auth/login | B 视觉 | **BLOCK** | 左侧品牌色块 + CTA + 链接全部使用旧蓝 `#2563FF`，违反 v2.0 紫罗兰主色 | 替换为 `bg-accent-gradient` / `text-primary`；同步 `src/app/auth/login/page.tsx` 与 register 页 |
| F4 | /results | B 视觉 | MEDIUM | 左侧分类 nav 与主区域未应用 glass-panel | 套用 `glass-panel` 类，与 S3/combo 视觉一致 |
| F5 | /combo | B 视觉 | LOW | 6 张场景模板缩略图复用同一只 LUMO 鸟，未提供真实预览图 | 补真实模板缩略图或临时改为渐变占位 |
| F6 | /combo | A 布局 | LOW | 底部「执行批量处理」是紫色实心按钮，Plan 期望"悬浮玻璃药丸" | 套用 glass-pill 样式 |
| F7 | /workspace/scene | A 布局 | LOW | StepBar 是简单圆点段，未做成"玻璃药丸"（pill）形式 | 与 Plan §S2 描述对齐 |

## R2.4 汇总判定

- **整体**：v2.0 设计语言落地大部分页面（首页/工作台/工具/设置/组合/提示词工作室）已统一紫罗兰 + 玻璃 + 衬线 token。
- **必修 Blockers（2）**：F2（/tasks 未迁移）、F3（/auth/login 蓝色硬编码）。
- **High 风险（1）**：F1（/tasks fetch 超时报错）。
- **可后置（4）**：F4-F7 视觉/资源细节。
- **建议**：T1 验收**不通过**，需修复 F1/F2/F3 后回归 → 再 close。

---

# Round 3 — F1/F2/F3 修复回归（PM T1 close）

**Date:** 2026-06-25
**Method:** chrome-devtools MCP headless，登录后 9 屏 light 全量 + 8 屏 dark 全量（S9 在 R2 已验登录页，且修复后 -after 已记录），最后查 console。
**Screenshots:** `.planning/ui-reviews/2026-06-25/R3-S{1..8}-{light,dark}.png` + Round 2 的 `-after.png`。

## R3.1 修复确认

| 子任务 | 验证 | 结果 |
|---|---|---|
| T2 / F1 | /tasks 停留 + 切其他页 console | **PASS**（无 TimeoutError，整轮 9 屏只 1 个无关 404） |
| T3 / F2 | /tasks 紫罗兰胶囊 Tab + glass-panel 卡 + 衬线 h1（light + dark） | **PASS** |
| T4 / F3 | /auth/login 左侧紫罗兰渐变 + 紫色 CTA + text-primary 链接；register 同步；grep auth 无蓝色硬编码 | **PASS** |

## R3.2 9 屏 light + dark 矩阵

| # | 屏 | Light | Dark | 备注 |
|---|---|---|---|---|
| 1 | `/` | PASS | PASS | 紫渐变 hero + 玻璃预览卡，dark `bg #131316` 反色正确 |
| 2 | `/workspace/scene` | PASS | PASS | AppShell 双层栏 ✓，玻璃面板 dark 反色 ✓ |
| 3 | `/combo` | PASS | PASS | 三栏 glass + pipeline 紫徽标，dark 下连接线/序号清晰 |
| 4 | `/tools` | PASS | PASS | 紫罗兰胶囊组 + 三栏 glass，dark 下 active pill 仍紫 |
| 5 | `/results` | PASS | PASS | dark 下分类 nav active 紫色徽标 ✓（仍有 F4 玻璃缺失 - R2 已记录，不阻塞） |
| 6 | `/tasks` | **PASS（修复后）** | **PASS（修复后）** | 紫罗兰胶囊 Tab + glass-panel 卡 + 衬线 h1 都已生效 |
| 7 | `/settings` | PASS | PASS | 左 nav 紫渐变高亮 + 衬线 + provider 卡片 dark 适配 |
| 8 | `/prompt-studio` | PASS | PASS | 紫渐变运行 CTA + 组卡 dark 适配，并发徽标紫 |
| 9 | `/auth/login` | **PASS（修复后）** | n/a | 全屏品牌色块 → 紫罗兰渐变，CTA + 链接均紫，AuthShell 不在 AppShell 内不参与暗色切换 |

## R3.3 通用回归（修复后）

- [x] 顶栏不重复
- [x] `font-serif` 全屏生效（含 S6 修复后）
- [x] 主 CTA 紫罗兰渐变（含 S9 修复后）
- [x] 无蓝色硬编码（auth 已清，全仓 grep 通过）
- [x] Console 无 hydration / TimeoutError / React warning（仅 1 个无关 404 静态资源）

## R3.4 终判

- **T1 验收：通过**（v2.0 整站 UI/UX 落地完成）
- **遗留 4 个 LOW/MEDIUM FLAG**（R2 列出的 F4/F5/F6/F7）：
  - F4 /results glass-panel
  - F5 /combo 模板缩略图
  - F6 /combo 执行按钮玻璃药丸
  - F7 /workspace/scene StepBar 玻璃药丸

  这些不阻塞 v2.0 基线 close。已建议后续单独排期。

---

# Round 4 — F4-F7 顺手修复（T1 close 后追加）

**Date:** 2026-06-25
**Files:**
- F4 `/results`：`src/app/results/page.tsx` — h1 改 font-serif text-h2；左 sidebar / 顶 toolbar 套 `glass-panel`；空状态外层用 glass-panel + rounded-card + shadow-soft 包裹
- F5 `/combo`：`src/app/combo/page.tsx` — 删除 LUMO BrandImageFallback 占位，新增 `TEMPLATE_GRADIENTS` 8 色调色板，模板缩略图用 inline 渐变背景，移除未用 import
- F6 `/combo`：底部执行按钮组**原已是 glass-panel + rounded-full 浮动药丸**（R2 误判），无需修改
- F7 `/workspace/scene`：`src/app/workspace/scene/page.tsx` — StepBar 容器 `rounded-[16px]` → `rounded-full` + 加 shadow-soft

**Verification screenshots:** `R4-S2-workspace.png` / `R4-S3-combo.png` / `R4-S5-results.png`（dark 主题下截，三处修复都已生效）

**Lint:** 0 errors（164 warnings 同基线）

**遗留风险**：无。R2 列出的全部 4 个 FLAG 现已闭环。
