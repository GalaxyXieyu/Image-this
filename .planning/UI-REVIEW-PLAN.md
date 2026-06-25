# Imagine This 重设计 v2.0 · UI 验收测试计划

> 任务：PM **T1** · 9 屏逐屏验收 Phase 1-9 落地效果
> 执行依赖：dev server (`npm run dev`，端口 34123) + 浏览器自动化（chrome-devtools MCP / Playwright / 人工）
> 测试账号：`test@imaginethis.local` / `TestPassword123!`

## 0. 准备

| 步骤 | 命令 / 操作 |
|---|---|
| 启动 dev | `npm run dev`（后台） |
| 等待就绪 | 等到 `localhost:34123` 响应 200 |
| 登录 | `/auth/login` → 上述账号；保存 session cookie |
| 截图目录 | `.planning/ui-reviews/2026-06-25/{屏名}.png` |

## 1. 验收矩阵（9 屏 × 4 维度）

每屏统一检查 4 个维度。每维度给一个 **PASS / FLAG / BLOCK** + 简注。

| 维度 | 检查点 |
|---|---|
| **A 布局** | 单行两级 AppShell 顶栏、`100dvh` 不溢出、响应式 zoom（1240/1080/920 三档）、栏宽符合设计 |
| **B 视觉 token** | 紫罗兰主色（#7B5CFF）、玻璃面板（`backdrop-filter: blur(20px) saturate(160%)`）、Newsreader 衬线标题、`bg-accent-gradient` 主 CTA、`rounded-card / shadow-soft / shadow-float` |
| **C 交互** | 各页关键交互（见下表）能正常切换状态；hover/active/disabled 视觉反馈正确 |
| **D 主题** | 亮色 → 暗色切换无错位、token 反色生效（暗色 `#9D86FF` accent / `#1C1C21` surface） |

## 2. 9 屏逐屏脚本

### S1 · `/` 首页
- **关键交互**：CTA「开始生成场景图」→ `/workspace/scene`；CTA「打开智能工具箱」→ `/tools`
- **应看到**：玻璃 Hero + 衬线 46px 大标题 + 紫罗兰渐变高亮「专业视觉」+ 右侧两张浮动玻璃预览卡 + 「3 秒生成」徽标 + 衬线 01/02/03 三栏

### S2 · `/workspace/scene` 场景生成
- **关键交互**：3 步切换；平台 pill 多选；上传 dropzone hover；底部 sticky 玻璃操作条「下一步」推进
- **应看到**：StepBar 居中玻璃药丸（已完成段染色 brand）；Step1 三段 glass-panel；Step2 4 列模板（选中态 ring）；Step3 候选 processing → ConicSpinner

### S3 · `/combo` 组合工作流
- **关键交互**：左/右栏折叠 chevron → 变 12px 竖排标签条；步骤卡点击 → 右栏切换为该步参数；hover 步骤卡浮出上移/下移/删除；「添加处理步骤」直到 5/5 禁用；底部悬浮玻璃药丸「执行批量处理」
- **应看到**：3 栏 glass + 中栏 pipeline（连接线 + 序号徽标 + GripVertical）+ 右栏在「全局执行设置」/「步骤参数」之间切换

### S4 · `/tools` 单点工具箱
- **关键交互**：4 工具胶囊切换（背景/水印/放大/扩图）；上传 dropzone；批量模式 toggle；创建工具任务（mock - 检查 ConicSpinner 起来）
- **应看到**：顶部紫罗兰胶囊组替代下划线 tab；左右玻璃栏；中预览玻璃卡

### S5 · `/results` 图库
- **关键交互**：左侧 7 类分类切换（全部/场景图/主图/详情图/营销图/海报/白底图）；网格 ↔ 列表 segmented 切换；卡片 hover 浮出下载/删除；勾选 → 「批量下载/删除」激活
- **应看到**：`auto-fill minmax(160px,1fr)` 1:1 网格；选中态 ring；分类数字徽标

### S6 · `/tasks` 任务中心
- **关键交互**：tabs 切换（all/running/completed/failed）；进度刷新
- **应看到**：AppShell 顶栏正常承接，无重复 nav；卡片对齐 brand token（验证未漏迁移）

### S7 · `/settings` 设置中心
- **关键交互**：左侧 nav 切换 7 个 section（models/prompts/system/profile/runtime/updates/...）；选中态紫罗兰渐变高亮条
- **应看到**：衬线 H2 标题；glass-panel 左侧 nav 卡
- **已知**：7→4 Tab 合并、Provider 弹窗三类型 backlog

### S8 · `/prompt-studio` 提示词工作室（全屏，无 AppShell）
- **关键交互**：版本胶囊 v3/v2/v1 切换（内容同步）；模型/风格/比例下拉；「添加对比组」→ 横向多列（最多 4）；「运行调试」→ 前 2 组 running（ConicSpinner + shimmer 骨架），第 3+ 组 queued，2.4s 后全部 done
- **应看到**：紫色渐变 CTA + 并发横幅 + 「组 1（可编辑）」徽标

### S9 · `/auth/login` 登录
- **关键交互**：表单提交；错误提示
- **应看到**：无 AppShell（HIDDEN_PREFIXES 生效）；表单基础 token

## 3. 通用回归（每屏快速过）

- [ ] 顶栏不重复（页面级 TopNav 已全部清理）
- [ ] `font-serif` 实际生效（h1/h2 是 Newsreader 而非 sans）
- [ ] 主 CTA 实色按钮是紫罗兰渐变（非旧蓝）
- [ ] 没有任何 `border-blue-*` / 蓝色硬编码
- [ ] DevTools console 无 hydration mismatch / React warning

## 4. 执行清单

> 执行时间：2026-06-25；截图目录：`.planning/ui-reviews/2026-06-25/`；详见 `.planning/UI-REVIEW.md` Round 2。

| # | 屏 | 截图 | A 布局 | B 视觉 | C 交互 | D 主题 | 备注 |
|---|---|---|---|---|---|---|---|
| 1 | `/` | S1-home.png / S1-home-dark.png | PASS | PASS | PASS | PASS | — |
| 2 | `/workspace/scene` | S2-workspace-scene.png | PASS | PASS | PASS | n/t | StepBar 是圆点段非药丸（F7） |
| 3 | `/combo` | S3-combo.png | PASS | FLAG | PASS | n/t | 模板缩略图复用 LUMO 占位（F5）；执行按钮非药丸（F6） |
| 4 | `/tools` | S4-tools.png | PASS | PASS | PASS | n/t | — |
| 5 | `/results` | S5-results.png | PASS | FLAG | PASS | n/t | 无 glass-panel（F4） |
| 6 | `/tasks` | S6-tasks.png | PASS | **BLOCK** | PASS | n/t | Tab/卡片/标题全部未迁移 token（F2）；console TimeoutError（F1） |
| 7 | `/settings` | S7-settings.png | PASS | PASS | PASS | n/t | — |
| 8 | `/prompt-studio` | S8-prompt-studio.png / -run.png | PASS | PASS | PASS | n/t | 运行 demo 太快未观察 spinner 中间态 |
| 9 | `/auth/login` | S9-auth-login.png | PASS | **BLOCK** | PASS | n/t | 蓝色品牌色 + CTA + 链接全部违反 v2.0 紫色基线（F3） |

**结论：T1 不通过**，必修 F1/F2/F3。

## 5. 汇总产物

执行完成后：
1. 填写本表 + 每屏截图归档
2. 在 `.planning/UI-REVIEW.md` 追加本轮结果（已有文件，append 不覆盖）
3. `pm comment --task-id T1 --content "<结果摘要>"` 回写
4. 发现的 FLAG/BLOCK 单独建子任务
