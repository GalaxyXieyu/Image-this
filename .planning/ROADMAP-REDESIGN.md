# Roadmap: Imagine This 整站视觉重设计 (Milestone v2.0)

## Overview

依据 `design_handoff/design_handoff_imagethis_redesign/`(Claude Design 定稿)将整站从**蓝色品牌体系**切换到**紫罗兰玻璃拟态体系**。源真相 = `Image-this 重设计.dc.html` 原型 + 9 张 `screens/*.png` 参考图 + `README.md` 设计规范。

技术栈不变:Next.js 15 + React 19 + Tailwind v3 (`config/tailwind.config.js`) + shadcn/Radix。在现有 shadcn HSL token 体系上重新调色,新增 README 原始 token(玻璃/渐变/衬线标题),逐屏复刻。

### 关键决策(默认采用,可调整)
- 路由保留,仅改导航标签:`/results` 显示「图库」;`/templates` 内容并入设置·提示词工作室但保留可达。
- 9 个 Phase 划分。
- 旧代码清理/lint/build/Electron 回归并入各 Phase 验证 + 末尾轻量收尾。

## Phases

- [x] **Phase 1: 设计系统基座** — 紫罗兰 token、亮暗双主题、Newsreader+Plus Jakarta 字体、玻璃/渐变/阴影/圆角 utility、背景微光、动效(fadeUp/shimmer/spinner) ✅ lint 0 error / build 39/39
- [x] **Phase 2: App Shell + 统一导航 + 主题切换** — `AppShell` 单行两级导航(首页/工作台/图库/设置 + 更新/通知/主题)、工作台 segmented(场景生成/组合工作流/单点工具)+ /tools 二级胶囊、`100dvh` shell + 响应式 zoom(≤1240/1080/920)、`next-themes` 持久化亮暗主题;各页 TopNav 删除并交由 AppShell 统一渲染 ✅ lint 0 error / build 通过
- [x] **Phase 3: 首页 Hero** — 玻璃 hero(衬线大标题 + 紫罗兰渐变高亮「专业视觉」+ 描边/实色双 CTA) + 右侧两张玻璃预览卡(主卡「拖入商品图」+ 副卡 + 3 秒生成徽标) + 工作流三栏(衬线 01/02/03 + glass-panel)。已移除旧首页的 QuickActions/UseCases/FinalCTA(不在重设计 scope) ✅ lint 0 error / build 通过
- [x] **Phase 4: 场景生成向导** — StepBar 紫罗兰玻璃药丸条 + Step1 三段 glass-panel(产品信息 2×2 紧凑表单/平台 pill 多选/上传虚线 dropzone) + Step2 风格模板 4 列玻璃卡(选中态 ring) + Step3 候选卡 processing 用 ConicSpinner(conic-gradient + mask + pulseRing) + 三步底部均改为 sticky 玻璃操作条(返回首页/修改信息/预览 + 紫罗兰渐变主 CTA) ✅ lint 0 error / build 通过
- [x] **Phase 5: 组合工作流重构(改动最大)** — `/combo` 整页重写:可折叠三栏(左场景模板/中流水线/右设置,折叠态变 12px 玻璃竖排标签条) + 中栏「上传商品图片」输入卡 + 「处理流水线」分隔 + 可排序步骤卡(序号徽标 + GripVertical 占位 + hover 浮出上移/下移/删除 + 连接线) + 「添加处理步骤(N/5)」虚线 dropzone + 选中步骤→右栏切换该步参数(5 种 step 类型:scene/background/upscale/watermark/outpaint,SliderRow + ChipGroup 复用) + 未选中时显示「全局执行设置」(方案信息/批量数量/画面比例 5 段/输出清晰度 3 段/水印 toggle/重试 toggle) + 底部居中悬浮玻璃操作组(保存为常用模板 + 紫罗兰渐变「执行批量处理」) + 修正 task type 映射(scene→SCENE_GENERATION),payload 含 stepParams/global/templateId ✅ lint 0 error / build 通过
- [x] **Phase 6: 单点工具箱** — `/tools` 三栏 glassify(左玻璃栏输入/参数 + 中预览玻璃卡 + 右玻璃栏任务结果) + 顶部工具切换改为紫罗兰胶囊组(原下划线 tab) + 批量模式独立胶囊 toggle + 上传 dropzone(虚线+brand-soft 图标方块)+ 预览处理中用 ConicSpinner ✅ lint 0 error / build 通过
- [x] **Phase 7: 图库(results→图库)** — `/results` 改名「图库」+ 玻璃左栏 7 类分类 nav(全部/场景图/主图/详情图/营销图/海报/白底图,选中态紫罗兰渐变数字徽标) + 单行工具栏(全选/搜索/网格-列表 segmented/批量下载-删除) + 网格视图改 1:1 `auto-fill minmax(160px,1fr)` glass-panel 卡(角标分类 + 浮出复选 + hover 渐变下载/删除浮层) + 列表视图卡片化 ✅ lint 0 error / build 通过
- [~] **Phase 8: 设置中心** — `/settings` 标题改为衬线 + glass-panel 左侧 nav 卡 + 选中态紫罗兰渐变高亮条 + brand 化文字 token;**未完成**:7→4 Tab 合并、Provider 弹窗三类型重构、系统并发数(1-4)全局共享值。需要单独迭代进行数据/逻辑迁移(标记 backlog) ✅ lint 0 error / build 通过
- [x] **Phase 9: 提示词工作室(全新全屏)** — 新增路由 `/prompt-studio`(AppShell 隐藏 + middleware 保护) + 顶栏(返回/标题/恢复编辑版本/保存新版本/紫罗兰渐变「运行调试」CTA) + 并发横幅(显示「共 N 组 · 系统并发上限 C · 可同时运行/超出排队」+「添加对比组」虚线胶囊 + 4 段并发数 readout) + 默认单列「组 1(可编辑)」,「添加对比组」横向展开为多列(最多 4,对比组只读+可删) + 每组:版本胶囊(v3/v2/v1 + 切换时同步内容) / 模型 Select / 入参 风格&比例 / 提示词 Textarea(`{风格}`/`{比例}` 占位提示) / 生成示例 3 张占位 + 状态徽标(生成中/排队中/已完成 + ConicSpinner + animate-shimmer 骨架) + 运行调试 demo 流程(并发上限 = 2,超出部分排队 2.4s 后完成);**说明**:并发数 UI 内联硬编码 2,真实读 P8 共享值留待 P8 收尾迭代 ✅ lint 0 error / build 通过

## Phase 验证基线(每个 Phase 收尾)
- `npm run lint` 无 error
- `npm run build` 通过
- 亮/暗主题各 smoke 一遍
- 不破坏 auth、task 队列、provider 配置、Electron runtime

## Progress

| Phase | Status |
|-------|--------|
| 1. 设计系统基座 | ✅ Complete |
| 2. App Shell + 导航 + 主题 | ✅ Complete |
| 3. 首页 Hero | ✅ Complete |
| 4. 场景生成向导 | ✅ Complete |
| 5. 组合工作流重构 | ✅ Complete |
| 6. 单点工具箱 | ✅ Complete |
| 7. 图库 | ✅ Complete |
| 8. 设置中心 | ~ Partial (visual restyle; section consolidation deferred) |
| 9. 提示词工作室 | ✅ Complete (UI shell; backend concurrency wiring deferred) |
