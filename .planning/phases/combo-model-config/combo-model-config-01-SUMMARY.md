---
phase: combo-model-config
plan: 01
subsystem: workbench/combo
tags: [model-selection, workflow-configuration, backend-integration]
dependency_graph:
  requires: []
  provides: [global-model-selection, metadata-provider-tracking]
  affects: [combo-workflow, scene-generation, background-replacement]
tech_stack:
  added: []
  patterns:
    - Global provider/modelName injection through inputData.global
    - Graceful template loading with backward compatibility for old globalParams
key_files:
  created: []
  modified:
    - src/app/api/images-process/workflow/one-click/service.ts
    - src/app/api/tasks/worker/route.ts
    - src/app/combo/page.tsx
    - src/lib/workbench/handlers/pipeline.ts
decisions:
  - D-01 全局共用一个生图模型选择器（不做每步单独选择）
  - D-02 直接选具体模型，provider 从模型条目带出
  - D-03 数据源 GET /api/models/available（已过滤 llm 的用户启用模型清单）
  - D-04 字段命名 global.aiModel(provider) + global.model(modelName) 贯通全链
completed_date: "2026-07-15"
duration: "1 session"
metrics:
  tasks_completed: 5
  files_modified: 4
  commits: 2
---

# Phase combo-model-config Plan 01: combo 全局生图模型可配置

**One-liner：** 让工作流模式用户在 /combo 顶部全局设置区选择具体生图模型（Gemini/GPT/即梦），真实贯通到 scene/background 执行链，并把实际所用 provider/model 写入结果 metadata 供验收。

---

## Objective Achieved

combo 工作流现已支持用户选择非默认生图模型：
- 前端 `/combo` 顶部全局设置区新增「生图模型」下拉，列出用户已启用的具体模型
- 选择范围包括 Gemini、GPT、即梦下的具体模型 id
- 选择正确贯通到后端执行链：`inputData.global → processPipeline → executeOrderedPipeline → processWith*`
- 完成的图像结果 metadata 记录实际使用的 provider/model，供验收佐证

---

## Implementation Summary

### Task 1A: 后端字段贯通 (service.ts)

**Commit:** `b6122f7`

**Changes:**
1. `OrderedPipelineStep` 接口加 `model?: string;`（具体模型 id）
2. `OrderedPipelineParams` 接口加 `model?: string;`（全局具体模型 id）
3. `executeOrderedPipeline` 解构 `model: globalModel`
4. scene/background 分支逻辑改进：
   - 解析 `provider = step.aiModel || globalAiModel`（provider 来源）
   - 解析 `modelName = step.model || globalModel`（具体模型 id）
   - 透传 `modelName` 作为第 5 参数给 `processWithGemini/GPT/Jimeng`
5. **关键：** metadata 补写 `provider` 和 `model` 字段
   ```json
   {
     "pipeline": ["scene", "background", ...],
     "provider": "gemini",  // 本次真实使用的 provider
     "model": "gemini-3.1-flash-image-preview",  // 本次真实使用的具体模型 id
     "processingCompletedAt": "2026-07-15T..."
   }
   ```

**Quality:**
- 无硬编码默认值，回退逻辑在 processWith* 内部（兼容未指定 modelName 的老调用）
- 符合 R-01 要求：只改真实链 processPipeline（唯一消费点），不碰死路径

---

### Task 1B: worker 转发 (worker/route.ts)

**Commit:** `b6122f7`

**Changes:**
- `processPipeline` 调用 `executeOrderedPipeline` 时追加 `model: (global.model as string) || undefined`

**说明：** 将前端注入的 global.model 原样透传，保证字段贯通完整性。

---

### Task 2: 前端模型选择器 + global 注入 (combo/page.tsx)

**Commit:** `0f466ac`

**Changes:**
1. **新增 state**（约 line 511）：
   ```ts
   const [availableModels, setAvailableModels] = useState<...>([]);
   const [selectedImageModel, setSelectedImageModel] = usePageDraft<...>(
     "workbench.combo.imageModel", null
   );
   ```
   - `selectedImageModel` 用 `usePageDraft` 持久化，刷新后保留用户选择

2. **useEffect 加载清单**（约 line 551）：
   - GET `/api/models/available` 获取用户已启用模型清单
   - 默认策略：优先沿用已持久化的选择 → 选 Gemini → 选第一个
   - 清单为空不阻塞（提交时 `hasEnabledImageModel()` 已拦截）

3. **GlobalSettingsPanel** 新增「生图模型」section：
   - BottomSheetSelect 下拉展示用户已启用模型
   - 清单为空时禁用并提示去设置
   - 说明文案：该选择仅作用于「生成场景图 / AI 换背景」步骤

4. **MobileGlobalSettings** 同步实现上述功能

5. **handleExecute global 注入**（约 line 668）：
   ```ts
   const global = {
     aspectRatio, resolution, watermarkEnabled, autoRetry,
     aiModel: selectedImageModel?.provider ?? "gemini",   // provider
     model: selectedImageModel?.modelName ?? undefined,   // 具体模型 id
   };
   ```

**Quality:**
- 复用项目已有 BottomSheetSelect/ChipGroup primitive，无硬编码样式
- 选择随草稿持久化，用户刷新后保留

---

### Task 3: 修正 background 写死 gemini (combo/page.tsx)

**Commit:** `0f466ac`

**Changes:**
1. `normalizeStepTaskInput` global 参数扩展（约 line 337）：
   ```ts
   global: {
     aspectRatio, resolution, watermarkEnabled, autoRetry,
     aiModel?: string;     // provider
     model?: string;       // 具体模型 id
   }
   ```

2. background 分支逻辑改进（约 line 358）：
   ```ts
   if (step.type === "background") {
     return {
       ...baseInput,
       aiModel: global.aiModel ?? "gemini",    // 不再硬编码 "gemini"
       model: global.model,
       ...
     };
   }
   ```

**说明：**
- **R-02 已修：** 原来 background 分支写死 `aiModel: "gemini"` 盖过全局选择，现改为回退全局 provider
- scene 分支走 default 返回，本就无 aiModel/model，executeOrderedPipeline 回退 globalAiModel/globalModel（无需改）

---

### Task 4: 模板持久化 + 旧模板兼容 (combo/page.tsx)

**Commit:** `0f466ac`

**Changes:**
1. **handleSave** 持久化模型（约 line 726）：
   ```ts
   globalParams: {
     aspectRatio, resolution, watermarkEnabled, autoRetry,
     aiModel: selectedImageModel?.provider,    // 持久化 provider
     model: selectedImageModel?.modelName,     // 持久化 modelName
   }
   ```

2. **handleLoadTemplate** 优雅还原（约 line 763）：
   ```ts
   const gp = template.globalParams as { aiModel?: string; model?: string };
   if (gp?.aiModel && gp?.model) {
     const restored = { provider: gp.aiModel, modelName: gp.model };
     // 只在模型仍在清单内才应用，否则保留当前选择
     setSelectedImageModel((prev) =>
       availableModels.some((m) => ...)
         ? restored
         : prev
     );
   }
   // 旧模板（无 aiModel/model）：不动 selectedImageModel
   ```

**Backward Compatibility:**
- ✅ 新模板：aiModel/model 字段被正确还原
- ✅ 旧模板（无 model 字段）：不崩、保留当前选择、可正常运行
- ✅ 已删除模型：即使旧模板里有，也回退到当前选择（避免报错）

---

### Task 5（P2）: 防漂移补齐 handlers/pipeline.ts

**Commit:** `b6122f7`

**Changes:**
- handlers/pipeline.ts `executeOrderedPipeline` 调用补齐 `model: (global.model as string) || undefined`

**说明：**
- handlers/pipeline.ts 在真实 batch:true 触发里是死路径（R-01）
- 补齐 model 转发是为了防止将来有人切到该路径时出现行为分叉
- 优先级 P2（如时间紧张可跳过，但已顺手补齐）

---

## Quality Assurance

### Linting & Type Checking

```bash
✅ npm run lint  — 0 errors（193 warnings 均为既有问题）
✅ npx tsc --noEmit  — 通过，无类型错
```

### Verification Checklist

- [x] OrderedPipeline 接口包含 `model?: string`
- [x] executeOrderedPipeline 解构出 globalModel 并透传给三个 processWith*
- [x] metadata 包含 provider/model（供 Task 6 端到端验收）
- [x] processPipeline + handlers/pipeline 均转发 global.model（保持一致）
- [x] combo/page.tsx global 对象注入 aiModel + model
- [x] normalizeStepTaskInput background 分支改用全局 provider（R-02 修正）
- [x] 模板 handleSave 持久化 aiModel + model
- [x] handleLoadTemplate 优雅还原新模板、旧模板无字段不崩

---

## Deviations from Plan

**None.** 计划完全按预期执行。

---

## Known Stubs

无。所有必要字段均已补齐（metadata.provider/model），没有写死空值或占位符。

---

## Next Steps (Task 6: 端到端验收)

**由主控使用浏览器完成** — executor 已完成 Task 1-5 的所有编码。

**验收要点：**
1. 打开 /combo，登录后上传商品图
2. 在新增「生图模型」下拉选择**非默认模型**（GPT / 即梦 下的某个具体模型）
3. 运行工作流，观察任务完成
4. 查看 `/tasks` 确认任务状态 + 进入该任务查看 ProcessedImage
5. 确认 metadata.provider / metadata.model 与所选保持一致
6. 测试默认 Gemini、加载旧模板（无 model 字段）的回归场景

---

## Commit References

- `b6122f7`: feat(combo-model-config): 后端字段贯通
- `0f466ac`: feat(combo-model-config): 前端模型选择器 + 全局注入 + 模板兼容

---

**Status：** Ready for Task 6 (Human Verification on Browser)
