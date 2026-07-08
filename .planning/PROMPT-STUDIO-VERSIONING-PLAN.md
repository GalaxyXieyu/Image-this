# 提示词版本管理 + 多版本/多模型对比测试 — 实施计划

> 状态：规划中（等确认后进入 /build）
> 日期：2026-07-07
> 需求来源：用户 —— 一个提示词多个版本；打开后多版本 + 多模型同时跑同一张测试图并排对比；择优保存。
> 关键背景：`/prompt-studio`（提示词工作室）已有**全量静态原型**（Roadmap Phase 9，后端接线 deferred）。本计划 = 给原型接真数据/API/生成链路 + 新增版本与实验的数据层。

## 0. 已定决策

| 项 | 决策 |
|---|---|
| 界面归属 | 接现有 `/prompt-studio` 原型；设置页「提示词模板」加"在工作室打开/对比"入口 |
| 持久化 | 版本入库（新表）；对比实验也落库，可回看/复现 |
| 择优保存 | 把胜出格对应的**版本设为该模板的当前/默认版本**（不强制存图、不记组合） |

## 1. 数据模型（新增，`prisma/schema.prisma`）

### 1.1 `PromptTemplateVersion`（新表）
- `id, templateId(→PromptTemplate, onDelete Cascade), userId, versionNo(Int, 模板内自增), label(String?), content(String, 提示词正文), note(String?), createdAt`
- 索引：`@@index([templateId, versionNo])`

### 1.2 `PromptTemplate`（改）
- 新增 `activeVersionId String?`（当前生效版本）+ 反向关系 `versions PromptTemplateVersion[]`
- 保留现有 `prompt` 字段作为"当前版本内容"的冗余镜像（向后兼容；生成链路本就从任务入参取 `customPrompt`，不直接读表，耦合低）

### 1.3 `PromptComparison` + `PromptComparisonCell`（新表，对比实验）
- `PromptComparison`：`id, templateId, userId, testImageUrl(输入图), note?, createdAt`
- `PromptComparisonCell`：`id, comparisonId(Cascade), versionId, provider, modelName, taskId(→TaskQueue?), processedImageId?, status` —— 一格 = 一个 (版本×模型) 运行
- 用途：回看历史对比、聚合结果网格；**inputData/outputData/结果保持"存引用不存 base64"**（遵守 CLAUDE.md）

### 1.4 迁移
- 一次 Prisma migration：为**存量每个模板**用当前 `prompt` 生成 `versionNo=1` 的版本，并回填 `activeVersionId`
- `npx prisma generate` + migration（不在 PM 初始化期间跑 DB 命令）

## 2. API（沿用现有 session→user→归属校验模式）

### 版本
- `GET  /api/prompt-templates/[id]/versions` — 列版本
- `POST /api/prompt-templates/[id]/versions` — 新建版本（工作室"保存为新版本"）
- `PATCH /api/prompt-templates/[id]/versions/[versionId]` — 改 label/note
- `POST /api/prompt-templates/[id]/versions/[versionId]/activate` — 设为当前版本（**择优保存**，同步镜像回 `PromptTemplate.prompt` + `activeVersionId`）
- `DELETE /api/prompt-templates/[id]/versions/[versionId]`（禁止删当前生效版本/最后一个版本）
- 现有 `GET /api/prompt-templates` 扩展返回 `versionCount` + `activeVersion`

### 对比实验
- `POST /api/prompt-templates/[id]/compare` — body `{ testImageAssetId, versionIds[], models[] }` → 展开 version×model 笛卡尔积，建 `PromptComparison` + N 个 `TaskQueue`（受 `user.taskConcurrency` 约束排队），返回 `{ comparisonId, cells[] }`
- `GET  /api/prompt-templates/[id]/comparisons` — 历史列表
- `GET  /api/comparisons/[comparisonId]` — 单次实验 + 每格状态/结果（轮询用；或复用 `/api/tasks/status`）
- `GET  /api/models/available`（或复用 settings 数据）— 从 `getUserConfig()` 各 provider `models(enabled && kind==='image')` 动态给出可选模型，替换原型里写死的 `MODELS`

## 3. 生成链路（复用为主）

- 复用已接受 `customPrompt + modelName + provider + fallbackModels` 的 handler（`handlers/background-replace.ts` 是样板）；对比每格 = 用 `version.content` 作 `customPrompt` + 该 `modelName` 提交任务
- 新增轻量任务类型 `workflowType: "prompt_compare"`（或复用背景替换类型），走 `worker-handlers.resolveHandler` 分派；provider 层**不改**
- 并发受 `user.taskConcurrency`（默认 2）约束，worker 已有排队；前端展示"排队/进行中/完成"

## 4. 前端（把原型接真，`src/app/prompt-studio/page.tsx`）

- 入口：设置页「提示词模板」每张卡加"在工作室打开"→ 带 `?templateId=` 进 studio
- 版本胶囊：改成读真实 `versions`；"保存为新版本"/"恢复为编辑版本"接 API
- 模型下拉：读 `/api/models/available`
- **补测试图上传**（原型缺失）：复用 `input-assets` 上传，作为对比输入图
- `runAll`（现为 `setTimeout` demo）→ 调 `/compare` + 轮询，把真实 `processedUrl` 填进结果格
- "择优保存"：选中某格 → 调 `activate` 把该版本设为当前
- 对比历史：列表 + 回看某次实验的结果网格

## 5. 分阶段执行

| 阶段 | 内容 | 产出/验收 |
|---|---|---|
| P1 数据层 | 新增 3 张表 + `activeVersionId`；迁移回填 v1 | `prisma generate` 通过；存量模板各有 v1 且 activeVersion 正确 |
| P2 版本 API + 设置页 | 版本 CRUD + activate；设置页版本列表 + "设为当前" + 工作室入口 | 设置页能看到/新建/切换版本 |
| P3 对比 API + 生成接线 | `/compare` 批量提交 + `prompt_compare` handler + 实验轮询 + 可用模型端点 | 能提交一次 2版本×2模型 的对比任务并查到状态 |
| P4 原型接真 | studio 接版本/模型/测试图上传/runAll→compare/保存版本/择优/历史 | 工作室全流程走通（非 mock） |
| P5 端到端验证 | 真机登录跑通：上传测试图 → 跑对比 → 并排看结果 → 择优设为当前版本；lint/build | 截图闭环；lint 0 error |

## 6. 需要盯的风险

- **成本/并发**：每格 = 一次真实生成（花钱）。矩阵会爆（4版本×3模型=12次），且并发上限默认 2。→ 前端限制矩阵规模 + 跑前提示消耗 + 清晰排队进度。
- **原型缺测试图输入**：必须补上传交互（P4）。
- **任务数据轻量**：`TaskQueue.inputData/outputData`、`ProcessedImage.metadata` 只存引用/路径，不存 base64/大图。
- **命名同步**：新任务类型要在 前端创建 / worker 分派 / 状态标签 / 结果聚合 全链路对齐（CLAUDE.md 已知风险）。
- **择优镜像**：activate 时把 `version.content` 同步回 `PromptTemplate.prompt`，避免旧读表路径拿到过期内容。

## 7. 不在本期范围（可后续）

- 版本 diff 可视化、对比结果打分/自动择优、把"版本×模型胜出组合"作为推荐配置、结果图自动入库（用户本期只要"设为当前版本"）。
