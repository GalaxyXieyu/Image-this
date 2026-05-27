# Roadmap: AI Product Visual Workbench Rebuild

## Overview

当前主线从桌面性能治理切换为新版 AI 商品视觉工作台重构。main 分支带入的 runtime、任务队列、输入资产引用和日志可观测性优化是新版的工程基线；接下来按 Pencil 设计稿重建前端信息架构、页面流程和 typed workflow API。

## Phases

- [x] **Phase 1: Product Visual Workbench Foundation** - 建立新版 app shell、路由、设计 token、workflow state 和 typed API contract 基础 (completed 2026-05-27)
- [x] **Phase 2: Template Library and Preset Model** - 实现模板库页面、预设数据模型和模板到工作流的入口 (completed 2026-05-27)
- [ ] **Phase 3: Scene Image Guided Workflow** - 实现场景图商品信息、候选生成、结果调整三步流程
- [ ] **Phase 4: Unified Smart Toolbox** - 用统一编辑器 shell 重建 AI 换背景、加水印、高清化、扩图等工具
- [ ] **Phase 5: Workflow API and Worker Contract Refactor** - 将任务提交、worker dispatch、结果 payload 规范化为 typed workflow contract
- [ ] **Phase 6: Old Frontend Removal and Regression Hardening** - 删除旧 workspace、补回归验证、检查 Electron/Windows 基线

## Phase Details

### Phase 1: Product Visual Workbench Foundation

**Goal**: 建立新版产品工作台基础架构，让后续页面开发不再依赖旧的 `src/app/workspace/page.tsx` 巨型客户端组件。

**Depends on**: main 分支 runtime/task/input-asset 优化基线

**Requirements**: [WB-01, WB-05, WB-06, WB-09]

**Success Criteria**:

1. 新 app shell、导航、步骤条、面板、画布和 action bar 有可复用组件。
2. 新 route map 明确覆盖首页、模板库、场景流程和工具箱。
3. workflow/domain 类型定义完成，区分 draft state、task state、result asset。
4. typed workflow API contract 草案完成，并能映射到现有任务系统。
5. 不破坏现有 settings、history、task、provider 和 Electron runtime。

**Plans**: 1 plan

Plans:

- [x] 01-01: Product visual workbench foundation

### Phase 2: Template Library and Preset Model

**Goal**: 建立模板库作为新版工作流入口，支持分类、预览、详情和一键使用。

**Depends on**: Phase 1

**Requirements**: [WB-02, WB-07]

**Success Criteria**:

1. 模板库页面符合设计稿三栏布局。
2. 模板/预设数据结构可表达场景图、背景、工具参数和提示词。
3. 系统预设可以 seed 或静态加载，后续可迁移到 DB。
4. 从模板详情进入场景工作流或工具箱时能携带 preset。

**Plans**: 1 plan

Plans:

- [x] 02-01: Template library and preset model

### Phase 3: Scene Image Guided Workflow

**Goal**: 实现场景图三步工作流，覆盖商品信息、候选生成和结果调整。

**Depends on**: Phase 1, Phase 2

**Requirements**: [WB-03, WB-05, WB-06, WB-07]

**Success Criteria**:

1. 商品素材和信息录入页可创建 scene workflow draft。
2. 候选生成页可提交任务并展示批量/单图进度。
3. 结果调整页可查看、选择、调整、保存结果。
4. 所有任务状态通过轻量 task/batch 查询驱动。

**Plans**: TBD after Phase 2

### Phase 4: Unified Smart Toolbox

**Goal**: 将单工具能力统一到一个编辑器 shell，减少旧 tab 模式重复状态。

**Depends on**: Phase 1

**Requirements**: [WB-04, WB-05, WB-06]

**Success Criteria**:

1. AI 换背景、加水印、高清化至少三个工具可用。
2. 左参数面板、中心画布、右结果面板和批量模式共享。
3. 旧工具组件中有价值的编辑器/上传/预览能力被复用或改造。

**Plans**: TBD after Phase 1

### Phase 5: Workflow API and Worker Contract Refactor

**Goal**: 把任务创建、worker dispatch 和结果 payload 从历史松散 JSON 收敛为可维护的 workflow contract。

**Depends on**: Phase 1, Phase 3, Phase 4

**Requirements**: [WB-05, WB-06, WB-07, WB-09]

**Success Criteria**:

1. 新 UI 不直接构造任意 `TaskQueue.inputData` 字符串。
2. worker 按 typed workflow/tool handler 分发。
3. 结果 payload 对场景图、工具输出、批量任务保持一致。
4. 旧任务和历史记录在迁移期仍可读取。

**Plans**: TBD after Phase 3/4

### Phase 6: Old Frontend Removal and Regression Hardening

**Goal**: 删除旧 workspace 代码，补齐新流程回归验证，并确认桌面端基线未退化。

**Depends on**: Phase 2, Phase 3, Phase 4, Phase 5

**Requirements**: [WB-08, WB-09]

**Success Criteria**:

1. 旧 workspace tab store、旧页面和无引用组件被删除。
2. 首页、模板库、场景流程、工具箱、设置、历史均有 smoke 验证。
3. `npm run build` 通过。
4. Electron 启动、任务后台处理、输入资产引用和数据安全策略仍有效。

**Plans**: TBD after Phase 5

## Historical Baseline

以下已合入 main 的 GSD phase 保留为工程基线和回归参考，不再代表当前执行主线：

- `01-desktop-runtime-performance`
- `02-task-input-asset-references`
- `03-app-log-observability`

## Progress

**Current focus:** Phase 3 - Scene Image Guided Workflow

| Phase | Plans Complete | Status |
|-------|----------------|--------|
| 1. Product Visual Workbench Foundation | 1/1 | Complete |
| 2. Template Library and Preset Model | 1/1 | Complete |
| 3. Scene Image Guided Workflow | 0/TBD | Pending |
| 4. Unified Smart Toolbox | 0/TBD | Pending |
| 5. Workflow API and Worker Contract Refactor | 0/TBD | Pending |
| 6. Old Frontend Removal and Regression Hardening | 0/TBD | Pending |

