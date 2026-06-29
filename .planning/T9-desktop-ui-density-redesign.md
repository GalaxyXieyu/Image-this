# T9 — Web 桌面端 UI 信息密度重构方案

> 任务：飞书 T9 · tasklist「Image-this」
> 目标：保持移动端(<md)完全不变的前提下，桌面端(≥md/lg)提高信息密度、减少操作层级、让常用操作更便捷。
> 约束：不改业务逻辑；复用现有设计 token 与 shadcn 原子组件；移动端零回归。

## 1. 现状诊断（代码 + 实测证据）

**外壳（`src/components/navigation/AppShell.tsx`）**
- 桌面端**无侧栏**，只有顶部 nav；工作台页还要额外一行二级 nav（两行导航 = 层级冗余）。
- 移动端用底部 `MobileTabBar` + `FloatingTaskButton`，断点 `useIsMobile`=768(md)。
- `main` 为 `flex-1 min-h-0 overflow-hidden`，每页自管滚动。

**各页正文容器被窄宽度卡死，桌面两侧大量留白**
- `/tasks` = `max-w-5xl` 居中 → 整宽巨卡，1440×900 仅 ~3 条。
- `/workspace/listing-set` = `max-w-3xl`(768px) 居中。
- `/workspace/scene` = `max-w-[1100px]` 居中 + 三步向导(选模板→上传→生成) + 4 列大卡。
- `/settings` 居中卡片，两侧大留白。

**已经做对的范式（可作样板）**
- `/results`(`w-[220px]` 侧栏 + grid)、`/templates`(`w-[260px]`)、`/tools`(`w-[320/340px]` + `md:flex-row`)、`/combo` 双栏。

**结论**：`/tasks`、`/workspace/scene`、`/workspace/listing-set`、`/settings` 是典型「移动端放大版」；其余页已具双栏雏形，需提密度并对齐统一外壳宽度。

## 2. 已确认设计决策

| 维度 | 决策 |
|------|------|
| 桌面导航 | **加桌面左侧固定侧栏**（≥lg），收纳一级 + 工作台二级 nav，扁平化 |
| 落地范围 | **一次重构全部主要页面**（分批提交） |
| 生成类页面 | **桌面单屏双栏 + 去步骤向导**；移动端保留分步 |

## 3. 架构方案

### 3.1 外壳 AppShell 改造
- 新增 `DesktopSidebar` 组件，`hidden lg:flex` 固定左栏：一级 nav（首页/工作台/图库/设置）+ 工作台展开二级（套图/换背景/工作流/工具）+ 底部右上功能（更新/通知/主题）。
- 顶部 header：`lg` 起隐藏顶部一级 nav 与工作台二级 nav row（移入侧栏），只留页面标题 + 必要操作；`md~lg` 之间维持现状顶部 nav（侧栏仅 lg+ 出现，避免中屏挤压）。
- `main` 在 `lg:` 留出侧栏宽度。
- 移动端(<md)分支（`md:hidden`、`MobileTabBar`）**完全不动**。
- 断点策略：sidebar 仅 `lg`(1024)+；`md~lg` 维持顶部 nav；`<md` 移动端不变。

### 3.2 两套页面布局范式（统一标准）
- **范式 A · 生成工作台**（scene / listing-set / combo / tools）：桌面单屏双栏 = 左控制栏(可滚：模板/参数/商品信息/生成按钮) + 右预览/结果。桌面去步骤向导；移动端保留分步。
- **范式 B · 库/列表**（results / templates / tasks）：左分类/筛选侧栏 + 右密集网格/表格。
- 容器宽度：移除窄 `max-w-3xl/5xl/1100px`，桌面改 `max-w-screen-2xl` 或 full + padding，并随 `xl/2xl` 增加网格列数。

### 3.3 逐页改造清单
- **/tasks**：`max-w-5xl` 巨卡 → 桌面紧凑表格/行（缩略图+标题+状态+进度+操作），每屏 10+ 条；移动端保留卡片。
- **/workspace/scene**：三步向导 → 桌面双栏（左模板 grid + 商品信息 + 生成，右预览/结果）；移动端保留分步。
- **/workspace/listing-set**：`max-w-3xl` → 桌面双栏（左上传+商品信息+出词，右草稿/结果）。
- **/tools**、**/combo**：已双栏，提密度 + 对齐侧栏后的可用宽度；注意 combo 自带 fixed 底部操作栏与侧栏的避让。
- **/results**：已侧栏+grid，增加网格列数 + 压缩 header 竖向留白。
- **/templates**：已双栏，提密度。
- **/settings**：居中卡片 → 桌面左 section 导航 + 右内容，去窄 max-w。

### 3.4 密度 token
- 在 `globals.css` / tailwind 既有 token 基础上，定义桌面密度间距（更紧 padding/gap）与卡片尺寸档，避免散落硬编码。

## 4. 验收标准
- 移动端(<md)视觉/交互 **100% 不变**（同断点前后截图对比）。
- 桌面各页无大块水平留白；首屏信息量量化提升（如 /tasks 每屏条数、/results 模板每屏数）。
- 生成页桌面单屏完成、无步骤向导。
- `npm run lint` + `npm run build` 通过。
- 真实浏览器闭环：桌面(1440) + 移动(390) 双断点逐页截图验证。

## 5. 实施分期（全部页面，分批提交）
- **P1** 外壳 `DesktopSidebar` + 容器宽度框架（双断点验证）。
- **P2** 生成页范式 A：scene、listing-set。
- **P3** 库/列表范式 B：tasks、results、templates。
- **P4** tools、combo、settings 收口 + 密度 token 统一。
- 每批均做桌面 + 移动双断点验证后再进入下一批。

## 6. 风险
- 移动端回归：用 `md:`/`lg:` 前缀隔离，AppShell `md:hidden` 分支不动。
- combo 的 fixed 底部栏与新侧栏冲突 → 需调整避让。
- 全量重构回归面广 → 分批 + 双断点截图兜底。
