# AI Studio 详细设计文档

## 1. 背景与目标

将 [ec-visual](https://github.com/sylarchen1389/ec-visual) 的核心商品图生成能力融入 **Image-this**，不是复制，而是**重新设计交互与架构**，打造一个叫 **AI Studio** 的多任务创意工作台。

### 核心设计原则
1. **AI 先分析，用户再确认/调整** —— 不是黑盒，分析结果完全可编辑。
2. **功能自由组合** —— 抠图、生图、合成、扩图、高清化、水印像积木一样可勾选组合。
3. **多任务并行** —— 一个商品图生成任务可以在后台跑，同时新建/编辑另一个任务。
4. **零滚动、分步骤** —— 三步向导（上传分析 → 配置生成 → 结果预览），一屏可见。
5. **任务进度与参数始终可见** —— 底部固定摘要栏，随时知道当前在做什么。

---

## 2. 产品定位

### 在 Image-this 中的位置
- **AI Studio 是一个独立的全屏工作台**（路由 `/ai-studio`），不从属于现有的 6 个 Workspace Tabs。
- **入口**：顶部导航栏新增 "AI Studio"，点击进入全屏工作台。
- **任务中心**（`/tasks`）独立汇总所有 AI Studio 的历史任务，是只读归档页。
- **现有 Workspace Tabs（一键增强/背景替换/扩图/高清化/水印/视频）完全不受影响**。

### 功能分层
| 层级 | 功能 | 说明 |
|------|------|------|
| **核心** | AI 分析 + Prompt 规划 + 多场景生成 | 从 ec-visual 移植的核心竞争力 |
| **扩展** | 风格复刻 | 结果页的"换风格"操作 |
| **工具** | Inpainting + Canvas 编辑器 | 结果页的通用编辑入口 |
| **复用** | 扩图 / 高清化 / 水印 | 直接调用 Image-this 现有 API |

---

## 3. 交互设计

### 3.1 整体布局（零滚动）

```
┌──────────────────────────────────────────────────────────┐
│  Logo    [🔵 蓝牙音箱 ▼] [ 运动鞋 ] [+ 新建]    任务中心 │  ← 任务标签栏
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ① 上传分析    →    ② 配置生成    →    ③ 结果预览       │  ← Stepper
│   ●──────────────●──────────────○                        │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │                                                      ││
│  │              当前步骤的内容区域                        ││  ← 内容区
│  │            （自适应布局，内部不滚动）                     ││
│  │                                                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │  📋 蓝牙音箱 | 主图+场景+卖点 | 智能全套 | 待生成      ││  ← 任务摘要栏
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│         [ 上一步 ]              [ 下一步 ]                │  ← 步骤导航
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 3.2 任务标签栏

- **每个进行中的任务是一个标签**，显示任务名（默认取产品名）。
- **下拉切换**：点击当前标签展开下拉列表，列出所有进行中的任务，点击切换。
- **新建任务**：`[+]` 按钮，创建空任务并自动聚焦。
- **关闭任务**：标签上的 `×`，关闭时提示"保存到任务中心？"。
- **后台生成**：Step 3 点击生成后，任务状态变为 `generating`，可以切换到其他任务继续配置。生成完成后标签显示 ✅ 红点提示。

### 3.3 Stepper 三步向导

| 步骤 | 名称 | 可回退 | 内容 |
|------|------|--------|------|
| **Step 1** | 上传分析 | — | 上传商品图 → AI 分析 → 可编辑的分析档案 |
| **Step 2** | 配置生成 | ✅ | 选择生成策略、输出场景、附加处理、快速预设 |
| **Step 3** | 结果预览 | ✅ | 进度面板 + 结果网格，支持单图操作 |

- **已完成步骤可点击回退**，未完成的步骤置灰不可点。
- 步骤切换时保留所有已填数据。

### 3.4 任务摘要栏（始终可见）

固定在内容区下方，实时显示：
- 产品名称
- 已选场景（主图/场景/卖点...）
- 生成策略（智能全套/直接生成/仅换背景）
- 当前状态（待分析 / 分析中 / 待生成 / 生成中 场景2/4 / 已完成）

### 3.5 Step 1：上传与分析

```
┌────────────────────────┬────────────────────────┐
│                        │                        │
│    ┌────────────┐      │  产品名称              │
│    │            │      │  [蓝牙音箱           ] │
│    │  拖拽上传   │      │                        │
│    │  商品图     │      │  核心卖点              │
│    │            │      │  [360°环绕音质      ] │
│    └────────────┘      │  [24小时续航        ] │
│                        │  [+ 添加卖点]          │
│                        │                        │
│                        │  推荐场景              │
│                        │  ☑ 主图  ☑ 场景  ☑ 卖点│
│                        │                        │
│                        │  风格关键词            │
│                        │  [简约, 高端, 白底...] │
│                        │                        │
│                        │  [🔄 重新分析]         │
│                        │  [跳过分析，手动填写]   │
└────────────────────────┴────────────────────────┘
```

- **上传后立即自动分析**（如果配置了 Gemini）。
- **分析结果完全可编辑**：产品名、卖点（可增删改）、推荐场景、风格关键词。
- **跳过分析**：提供按钮，直接进入手动填写模式。
- **重新分析**：修改了图片后可以重新触发分析。

### 3.6 Step 2：配置生成

```
┌────────────────────────────────────────────────┐
│  生成策略（卡片单选）                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  │  智能全套   │ │  直接生成   │ │  仅换背景   │ │
│  │  抠图+生成  │ │  AI直接画   │ │  抠图+替换  │ │
│  └────────────┘ └────────────┘ └────────────┘ │
│                                                │
│  输出场景（图标卡片多选）                        │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  │主图│ │场景│ │卖点│ │细节│ │对比│           │
│  └────┘ └────┘ └────┘ └────┘ └────┘           │
│                                                │
│  附加处理（开关/多选）                           │
│  [智能扩图 ●]  [高清放大 ○]  [品牌水印 ●]       │
│                                                │
│  快速预设：                                     │
│  [电商全套] [社媒海报] [白底主图] [详情页套装]   │
└────────────────────────────────────────────────┘
```

- **生成策略**：
  - **智能全套** = 抠图 → AI 生成背景 → 合成（ec-visual 完整 pipeline）
  - **直接生成** = 用 Gemini/Jimeng 直接根据 prompt 生成带产品的完整图（不抠图）
  - **仅换背景** = 抠图 → 调用现有背景替换功能 → 可选扩图/高清化/水印
- **快速预设**：本质是"策略 + 场景 + 附加处理"的模板，一键填充配置。
- 选择预设后，上方所有选项自动更新，用户仍可手动微调。

### 3.7 Step 3：结果预览

```
┌────────────────────────┬────────────────────────┐
│                        │                        │
│  进度面板               │  结果网格               │
│  ┌──────────────────┐  │  ┌────┐ ┌────┐        │
│  │ 场景 1/4          │  │  │主图│ │场景│        │
│  │ ████████░░ 80%   │  │  └────┘ └────┘        │
│  │ 正在生成背景...   │  │  ┌────┐ ┌────┐        │
│  └──────────────────┘  │  │卖点│ │细节│        │
│                        │  └────┘ └────┘        │
│  [全部下载] [重新配置]  │                        │
│                        │  悬停显示：✏️编辑 🔄重绘 │
└────────────────────────┴────────────────────────┘
```

- **左侧进度面板**：生成中时显示当前阶段和进度条，已完成时显示"生成完成"统计。
- **右侧结果网格**：2x2 或自适应布局，每张图显示场景类型标签。
- **单图悬停操作**：
  - 下载
  - 编辑（进入 Inpaint/Canvas 编辑器）
  - 重绘（单场景重新生成）
  - 删除
- **底部操作**：`[上一步]` 回到 Step 2 调整配置重新生成，`[新建任务]` 开启新任务。

### 3.8 任务中心（独立页面 `/tasks`）

```
┌────────────────────────────────────────────────────────┐
│  任务中心                              [返回工作台]     │
├────────────────────────────────────────────────────────┤
│  筛选：[全部] [进行中] [已完成] [失败]  [搜索...]       │
├────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 📷 蓝牙音箱      │  │ 📷 运动鞋        │             │
│  │ 状态: ✅ 已完成  │  │ 状态: 🔄 生成中  │             │
│  │ 5张图 | 2小时前  │  │ 3/5场景 | 5分钟前│             │
│  │ [载入工作台]     │  │ [查看进度]       │             │
│  └─────────────────┘  └─────────────────┘             │
└────────────────────────────────────────────────────────┘
```

- **只读汇总**：展示所有任务的缩略图、状态、结果数量、创建时间。
- **操作**：
  - **载入工作台**：将历史任务恢复到 AI Studio 工作台继续编辑/重生成。
  - **批量下载**：下载该任务所有结果图。
  - **删除**：彻底删除任务及结果。
- **筛选与搜索**：按状态筛选，按产品名搜索。

---

## 4. 数据模型

### 4.1 核心类型

```typescript
// ==================== 场景类型 ====================
type SceneType = 'main' | 'lifestyle' | 'benefit' | 'detail' | 'comparison';

interface SceneConfig {
  type: SceneType;
  label: string;           // 显示名称，如"主图"
  aspectRatio: string;     // 如 "1:1", "16:9"
  defaultCount: number;    // 默认生成几张该类型
}

// ==================== AI 分析结果 ====================
interface AnalysisResult {
  productName: string;
  sellingPoints: string[];     // 可增删改
  suggestedScenes: SceneType[];
  selectedScenes: SceneType[]; // 用户实际勾选
  styleKeywords: string[];
  rawPrompt: string;           // AI 生成的原始 prompt 草稿
}

// ==================== 生成配置 ====================
type GenerationStrategy = 'smart-full' | 'direct-generate' | 'bg-replace';
type AddonType = 'outpaint' | 'upscale' | 'watermark';

interface GenerationConfig {
  strategy: GenerationStrategy;
  scenes: SceneType[];
  addons: AddonType[];
}

// ==================== 单张结果 ====================
interface SceneResult {
  sceneId: string;         // 如 "scene-main-01"
  sceneType: SceneType;
  title: string;           // 如"商品主图"
  url: string;             // 结果图 URL
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorMessage?: string;
}

// ==================== 任务 ====================
interface AiStudioTask {
  id: string;
  name: string;            // 任务显示名，默认 productName，用户可改

  // 导航与状态
  step: 1 | 2 | 3;
  status: 'draft' | 'analyzing' | 'ready' | 'generating' | 'completed' | 'failed';

  // Step 1 数据
  productImage: {
    id: string;
    preview: string;       // blob URL / data URL
    base64: string;
  } | null;
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;

  // Step 2 数据
  config: GenerationConfig;

  // Step 3 数据
  generationJobId: string | null;   // 关联的 TaskQueue ID
  progress: number;                 // 0-100
  currentStage: string;             // 用户友好的阶段描述
  results: SceneResult[];

  // 元数据
  createdAt: number;
  updatedAt: number;
}
```

### 4.2 预设配置

```typescript
interface PresetConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  strategy: GenerationStrategy;
  scenes: SceneType[];
  addons: AddonType[];
}

const DEFAULT_PRESETS: PresetConfig[] = [
  {
    id: 'ecommerce-full',
    name: '电商全套',
    icon: 'shopping-bag',
    description: '主图 + 场景图 + 卖点图 + 细节图',
    strategy: 'smart-full',
    scenes: ['main', 'lifestyle', 'benefit', 'detail'],
    addons: ['upscale', 'watermark'],
  },
  {
    id: 'social-media',
    name: '社媒海报',
    icon: 'image',
    description: '场景图 + 卖点图，16:9 横版',
    strategy: 'direct-generate',
    scenes: ['lifestyle', 'benefit'],
    addons: [],
  },
  {
    id: 'white-bg-main',
    name: '白底主图',
    icon: 'square',
    description: '抠图 + 纯白背景，适合电商平台',
    strategy: 'bg-replace',
    scenes: ['main'],
    addons: ['upscale'],
  },
  {
    id: 'detail-page',
    name: '详情页套装',
    icon: 'file-text',
    description: '卖点图 + 细节图 + 对比图',
    strategy: 'smart-full',
    scenes: ['benefit', 'detail', 'comparison'],
    addons: ['watermark'],
  },
];
```

---

## 5. 状态管理

### 5.1 Store 设计

新建 `src/stores/useAiStudioStore.ts`，专门管理多任务工作台：

```typescript
interface AiStudioStore {
  // === 多任务 ===
  tasks: AiStudioTask[];
  activeTaskId: string | null;

  // === 任务生命周期 ===
  createTask(): string;                       // 新建空任务，返回 taskId
  switchTask(taskId: string): void;           // 切换当前任务
  closeTask(taskId: string): void;            // 关闭标签（提示是否保存到任务中心）
  deleteTask(taskId: string): void;           // 彻底删除
  renameTask(taskId: string, name: string): void;

  // === Step 1: 上传与分析 ===
  setTaskImage(taskId: string, image: AiStudioTask['productImage']): void;
  startAnalysis(taskId: string): void;        // 设置 isAnalyzing = true
  setTaskAnalysis(taskId: string, analysis: AnalysisResult): void;
  clearAnalysis(taskId: string): void;        // 清空，进入手动模式
  updateAnalysisField(taskId: string, field: keyof AnalysisResult, value: any): void;

  // === Step 2: 配置 ===
  setTaskConfig(taskId: string, config: GenerationConfig): void;
  applyPreset(taskId: string, presetId: string): void;  // 应用预设

  // === Step 3: 生成与结果 ===
  startGeneration(taskId: string, jobId: string): void;
  updateTaskProgress(taskId: string, progress: number, stage: string): void;
  updateSceneResult(taskId: string, sceneId: string, patch: Partial<SceneResult>): void;
  setTaskResults(taskId: string, results: SceneResult[]): void;
  completeGeneration(taskId: string): void;
  failGeneration(taskId: string, error: string): void;

  // === 步骤导航 ===
  setTaskStep(taskId: string, step: 1 | 2 | 3): void;

  // === Getter ===
  getActiveTask(): AiStudioTask | undefined;
  getTaskById(taskId: string): AiStudioTask | undefined;
}
```

### 5.2 持久化策略

- **工作台中的任务**：仅存于 Zustand Store（内存），刷新页面丢失。这是可接受的，因为任务中心会保存已完成的任务。
- **任务中心的数据**：存到数据库（Prisma），长期保存。
- **生成过程中的任务**：即使页面刷新，也可以通过 `generationJobId` 关联到 `TaskQueue` 表，重新拉取进度恢复状态。

---

## 6. 核心流程

### 6.1 用户流程

```
用户进入 AI Studio
    ↓
自动创建空白任务（Step 1）
    ↓
上传商品图
    ↓
自动触发 Gemini Vision 分析
    ↓
展示分析档案（产品名、卖点、场景、风格）—— 用户可编辑
    ↓
点击 [下一步] 进入 Step 2
    ↓
选择生成策略 + 场景 + 附加处理（或点快速预设）
    ↓
点击 [开始生成]
    ↓
后台创建 TaskQueue 任务（type: AI_STUDIO_GENERATION）
    ↓
进入 Step 3，显示进度面板
    ↓
用户可切换到其他任务，本任务后台继续生成
    ↓
生成完成，标签显示 ✅ 提示
    ↓
用户切回本任务，查看结果网格
    ↓
单图操作：下载 / 编辑（Inpaint/Canvas）/ 重绘 / 删除
    ↓
点击 [保存到任务中心] → 数据持久化到数据库
```

### 6.2 数据流

```
Step1UploadAnalyze.tsx
    ↓ POST /api/ai-studio/analyze
        body: { productImageBase64: string }
    ↓ analyzer.ts
        → Gemini Vision 分析商品图
        ← AnalysisResult
    ↓ 用户编辑 AnalysisResult
    ↓ [下一步]

Step2Configure.tsx
    ↓ 用户选择 config（策略/场景/附加处理）
    ↓ [开始生成]
    ↓ POST /api/tasks
        body: {
            type: "AI_STUDIO_GENERATION",
            params: {
                analysis: AnalysisResult,
                config: GenerationConfig,
                productImageBase64: string
            }
        }
    ↓ TaskWorker 轮询到任务

TaskProcessor.processAiStudioGeneration(task)
    ↓ pipelineExecutor.run(task.params)
        1. 如果 config.strategy === 'smart-full' || 'bg-replace'
           → mattingService.matte(productImage) → mattedPng
        2. promptBuilder.build(analysis, config.scenes)
           → Map<sceneId, prompt>
        3. 遍历每个 scene：
           - 如果 strategy === 'smart-full'
             → providerRouter.generate(prompt, { referenceImage: mattedPng })
             → composer.compose(mattedPng, generatedBg) → finalImage
           - 如果 strategy === 'direct-generate'
             → providerRouter.generate(prompt, { referenceImage: productImage })
           - 如果 strategy === 'bg-replace'
             → 调用现有 backgroundReplace service
        4. 如果 config.addons 含 'outpaint'
           → 调用现有 outpaint service
        5. 如果 config.addons 含 'upscale'
           → 调用现有 enhance service
        6. 如果 config.addons 含 'watermark'
           → 调用现有 watermark service
        7. storage.uploadBatch(finalImages) → 存到本地/图床
    ↓ 更新 TaskQueue COMPLETED
        outputData: { results: SceneResult[] }

前端 useTaskPolling 轮询
    ↓ Step3Result.tsx 更新进度与结果
```

---

## 7. 功能模块设计

### 7.1 模块总览

| 模块 | 文件 | 职责 | 来源 |
|------|------|------|------|
| **Analyzer** | `lib/ai-studio/analyzer.ts` | Gemini Vision 分析商品图，返回结构化档案 | 移植 ec-visual `buildWorkflowPromptPlan` |
| **Prompt Builder** | `lib/ai-studio/prompt-builder.ts` | 根据 AnalysisResult + SceneType 构建生成 Prompt | 移植 ec-visual prompt 模板逻辑 |
| **Matting Service** | `lib/ai-studio/matting.ts` | 自动抠图（Jimeng Cleanup API） | 移植 ec-visual `maybeAutoMatteProject` |
| **Background Generator** | `lib/ai-studio/bg-generator.ts` | AI 生成背景图 | 封装现有 provider generate 能力 |
| **Composer** | `lib/ai-studio/composer.ts` | 将抠图产品合成到背景上 | 移植 ec-visual `generateProjectPreviews` |
| **Provider Router** | `lib/ai-studio/provider-router.ts` | 多 Provider 路由与 Failover | 移植 ec-visual `generateImageWithPreferredProvider` |
| **Pipeline Executor** | `lib/ai-studio/pipeline-executor.ts` | 根据用户配置编排执行顺序 | 新写 |
| **Scene Templates** | `lib/ai-studio/scene-templates.ts` | 各场景类型的默认 Prompt 模板 | 移植 ec-visual `fallbackWorkflowPrompts` |

### 7.2 Analyzer（AI 分析器）

```typescript
// lib/ai-studio/analyzer.ts

interface AnalyzeOptions {
  productImageBase64: string;
  language?: 'zh' | 'en';
}

async function analyzeProduct(
  options: AnalyzeOptions
): Promise<AnalysisResult> {
  // 1. 调用 Gemini Vision API
  //    prompt: "分析这张商品图，返回 JSON：{ productName, sellingPoints[], suggestedScenes[], styleKeywords[], rawPrompt }"
  // 2. 解析并校验返回的 JSON
  // 3. 如果失败，返回本地兜底模板（基于通用商品模板）
}
```

**降级策略**：
- Gemini Vision 失败 → 返回本地通用模板，产品名留空，卖点留空，推荐场景默认 `[main, lifestyle]`。
- 用户可以随时手动填写。

### 7.3 Provider Router（多 Provider 路由）

```typescript
// lib/ai-studio/provider-router.ts

type ImageProvider = 'gemini' | 'jimeng' | 'volcengine';

interface GenerateOptions {
  prompt: string;
  referenceImage?: string;        // base64 或 URL
  size?: string;                  // 如 "1024x1024"
  preferredProvider?: ImageProvider;
  timeoutMs?: number;
}

async function generateImage(
  options: GenerateOptions
): Promise<{ provider: ImageProvider; imageBase64: string }> {
  // 1. 确定 Provider 优先级
  //    - 如果用户配置了 preferredProvider，优先尝试
  //    - 否则默认顺序：gemini → jimeng → volcengine
  // 2. 逐个尝试，一个失败自动切下一个
  // 3. 如果全部失败，抛出错误
}

async function generateBatch(
  items: Array<{ sceneId: string; prompt: string }>,
  options: GenerateOptions & { concurrency?: number }
): Promise<Map<string, { provider: ImageProvider; imageBase64: string }>> {
  // 并发控制：
  // - Jimeng 并发限制为 1
  // - Gemini / Volcengine 并发限制为 3-4
}
```

### 7.4 Matting Service（抠图服务）

```typescript
// lib/ai-studio/matting.ts

async function matteProduct(
  imageBase64: string,
  options?: { dehand?: boolean; trim?: boolean }
): Promise<string> {
  // 1. 如果 options.dehand，先调用 Jimeng Cleanup API 去除手持/杂物
  // 2. 调用 Jimeng / Volcengine Matting API 获取透明背景 PNG
  // 3. 如果 options.trim，裁剪透明边缘
  // 4. 返回 base64 或上传后的 URL
}
```

### 7.5 Composer（合成器）

```typescript
// lib/ai-studio/composer.ts

async function composeProductImage(
  productPng: string,       // 透明背景商品图
  backgroundImage: string,  // 生成的背景图
  options?: {
    productPosition?: 'center' | 'bottom-center' | 'custom';
    productScale?: number;   // 相对于画布的比例
    canvasSize?: { width: number; height: number };
  }
): Promise<string> {
  // 使用 Node.js Canvas API（如 `canvas` 或 `sharp`）
  // 1. 加载背景图
  // 2. 加载商品 PNG（保留 alpha 通道）
  // 3. 按 options 缩放/定位商品
  // 4. 叠加到背景上
  // 5. 输出 JPEG/PNG base64
}
```

### 7.6 Pipeline Executor（流水线执行器）

```typescript
// lib/ai-studio/pipeline-executor.ts

interface PipelineContext {
  taskId: string;
  analysis: AnalysisResult;
  config: GenerationConfig;
  productImageBase64: string;
  mattedImageBase64?: string;
  onProgress?: (progress: number, stage: string, sceneId?: string) => void;
}

async function executePipeline(ctx: PipelineContext): Promise<SceneResult[]> {
  const results: SceneResult[] = [];

  // Step 1: Matting（如果需要）
  if (ctx.config.strategy !== 'direct-generate') {
    ctx.onProgress?.(5, '正在识别产品主体...');
    ctx.mattedImageBase64 = await mattingService.matteProduct(ctx.productImageBase64);
  }

  // Step 2: Build Prompts
  ctx.onProgress?.(15, '正在规划生成方案...');
  const prompts = promptBuilder.build(ctx.analysis, ctx.config.scenes);

  // Step 3: Generate
  const total = prompts.length;
  for (let i = 0; i < total; i++) {
    const { sceneId, prompt, sceneType } = prompts[i];
    ctx.onProgress?.(
      20 + Math.floor((i / total) * 70),
      `正在生成场景 ${i + 1}/${total}...`,
      sceneId
    );

    let imageBase64: string;

    if (ctx.config.strategy === 'smart-full') {
      const bg = await providerRouter.generateImage({ prompt });
      imageBase64 = await composer.composeProductImage(ctx.mattedImageBase64!, bg.imageBase64);
    } else if (ctx.config.strategy === 'direct-generate') {
      const generated = await providerRouter.generateImage({ prompt, referenceImage: ctx.productImageBase64 });
      imageBase64 = generated.imageBase64;
    } else if (ctx.config.strategy === 'bg-replace') {
      // 调用现有背景替换服务
      imageBase64 = await backgroundReplaceService.process(ctx.mattedImageBase64!, prompt);
    }

    // Step 4: Addons
    if (ctx.config.addons.includes('outpaint')) {
      imageBase64 = await outpaintService.process(imageBase64);
    }
    if (ctx.config.addons.includes('upscale')) {
      imageBase64 = await enhanceService.process(imageBase64);
    }
    if (ctx.config.addons.includes('watermark')) {
      imageBase64 = await watermarkService.process(imageBase64);
    }

    // Step 5: Upload
    const url = await storage.uploadBase64(imageBase64);

    results.push({ sceneId, sceneType, title: getSceneTitle(sceneType), url, status: 'completed' });
  }

  ctx.onProgress?.(100, '生成完成');
  return results;
}
```

---

## 8. API 设计

### 8.1 AI Studio 分析接口

```
POST /api/ai-studio/analyze
Content-Type: application/json

Request:
{
  "productImageBase64": "data:image/jpeg;base64,..."
}

Response:
{
  "success": true,
  "data": {
    "productName": "蓝牙音箱",
    "sellingPoints": ["360°环绕音质", "24小时续航"],
    "suggestedScenes": ["main", "lifestyle", "benefit"],
    "selectedScenes": ["main", "lifestyle", "benefit"],
    "styleKeywords": ["简约", "高端", "白色背景"],
    "rawPrompt": "一个高端简约的蓝牙音箱，白色背景，专业产品摄影..."
  }
}

Error:
{
  "success": false,
  "error": "vision_analysis_failed",
  "fallback": true    // 表示已返回本地兜底模板
}
```

### 8.2 任务队列扩展

```
POST /api/tasks
Content-Type: application/json

Request:
{
  "type": "AI_STUDIO_GENERATION",
  "priority": 1,
  "params": {
    "analysis": { ...AnalysisResult... },
    "config": { ...GenerationConfig... },
    "productImageBase64": "data:image/jpeg;base64,..."
  }
}
```

### 8.3 任务进度查询

复用现有 `/api/tasks?status=PROCESSING` 轮询机制。

TaskWorker 处理 `AI_STUDIO_GENERATION` 时，通过 `updateJobState` 更新 `progress` 和 `currentStep`：

```
progress: 5   -> currentStep: "正在识别产品主体..."
progress: 15  -> currentStep: "正在规划生成方案..."
progress: 30  -> currentStep: "正在生成场景 1/4..."
progress: 50  -> currentStep: "正在生成场景 2/4..."
progress: 100 -> currentStep: "生成完成"
```

---

## 9. 组件结构

### 9.1 组件清单

| 组件 | 路径 | 职责 |
|------|------|------|
| **AiStudioWorkspace** | `components/ai-studio/AiStudioWorkspace.tsx` | 总壳：任务栏 + Stepper + 内容区 + 摘要栏 + 导航按钮 |
| **TaskTabBar** | `components/ai-studio/TaskTabBar.tsx` | 顶部任务标签栏（下拉切换、新建、关闭） |
| **StepIndicator** | `components/ai-studio/StepIndicator.tsx` | 三步指示器（可点击回退） |
| **Step1UploadAnalyze** | `components/ai-studio/Step1UploadAnalyze.tsx` | 第一步：上传区 + 分析档案编辑表单 |
| **Step2Configure** | `components/ai-studio/Step2Configure.tsx` | 第二步：策略卡片 + 场景多选 + 附加处理开关 + 预设按钮 |
| **Step3Result** | `components/ai-studio/Step3Result.tsx` | 第三步：进度面板 + 结果网格 |
| **SceneResultCard** | `components/ai-studio/SceneResultCard.tsx` | 单张结果图卡片（悬停显示操作菜单） |
| **TaskSummaryBar** | `components/ai-studio/TaskSummaryBar.tsx` | 底部固定摘要栏 |
| **PresetButtonGroup** | `components/ai-studio/PresetButtonGroup.tsx` | 快速预设按钮组 |
| **AnalysisForm** | `components/ai-studio/AnalysisForm.tsx` | 分析档案表单（产品名、卖点列表、场景勾选、风格关键词） |
| **ImageEditorModal** | `components/ai-studio/ImageEditorModal.tsx` | 通用编辑器弹窗（集成 Inpaint + Canvas） |
| **TaskCenterPage** | `app/tasks/page.tsx` | 任务中心独立页面 |

### 9.2 组件关系

```
AiStudioWorkspace
├── TaskTabBar
│   └── TaskDropdownMenu
├── StepIndicator
├── StepContent (根据 step 渲染)
│   ├── Step1UploadAnalyze
│   │   ├── ImageUploadZone
│   │   └── AnalysisForm
│   ├── Step2Configure
│   │   ├── StrategyCards
│   │   ├── SceneSelector
│   │   ├── AddonSwitches
│   │   └── PresetButtonGroup
│   └── Step3Result
│       ├── ProgressPanel
│       └── SceneResultGrid
│           └── SceneResultCard[]
├── TaskSummaryBar
└── StepNavigation
```

---

## 10. 与当前商品视觉工作台集成

### 10.1 保留的当前模块

| 当前模块 | 集成方式 |
|---------|---------|
| `TaskQueue` + 任务 worker | 承接异步生成、进度、重试和结果落库 |
| `ImageProcessorFactory` / `providers/*` | 作为 AI provider 能力入口 |
| `/api/images-process/outpaint` | 作为扩图能力入口 |
| `/api/images-process/enhance` | 作为高清化能力入口 |
| `/api/images-process/watermark` | 作为水印能力入口 |
| `uploadBase64Image` / storage | 保存生成结果和本地文件引用 |
| `useToast` | 统一用户反馈 |

### 10.2 不再延续的旧产品面

旧 tab 工作区、旧历史页、旧图库页和独立工具子页不再作为当前产品入口。新增能力统一进入商品视觉工作台主线：场景工作区、组合工作流、工具集合页、任务中心、结果管理和模板库。

### 10.3 当前路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/workspace/scene` | 商品场景工作区 | 商品信息、风格模板、生成与调整 |
| `/combo` | 组合工作流 | 多步骤视觉生产链路 |
| `/tools` | 工具集合页 | 背景、抠图、扩图、高清等基础能力 |
| `/tasks` | 任务中心 | 异步任务状态与进度 |
| `/results` | 结果管理 | 生成资产集中管理 |
| `/templates` | 模板库 | 商品视觉模板与预设 |

---

## 11. 数据库设计（Prisma Schema）

```prisma
model AiStudioTaskRecord {
  id          String   @id @default(cuid())
  userId      String
  name        String
  status      String   // completed | failed
  
  // 快照数据
  analysis    Json?    // AnalysisResult
  config      Json?    // GenerationConfig
  results     Json?    // SceneResult[]
  
  // 关联
  taskQueueId String?  @unique
  taskQueue   TaskQueue? @relation(fields: [taskQueueId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

// 扩展 TaskQueue 枚举或直接用字符串
generator client {
  provider = "prisma-client-js"
}

// 注意：TaskQueue 的 type 字段目前可能是枚举或字符串
// 需要确保支持 "AI_STUDIO_GENERATION"
```

---

## 12. 实施计划（分阶段）

### Phase 1：基础骨架（可运行空壳）
1. 新建 `/ai-studio` 页面和 `/tasks` 页面
2. 新建 `useAiStudioStore`（多任务管理 + 步骤导航）
3. 实现 `AiStudioWorkspace` 总壳（任务栏 + Stepper + 摘要栏 + 导航按钮）
4. 三个步骤的空壳组件（只有布局，无业务逻辑）

**验收标准**：可以新建/切换/关闭任务，三步可以来回切换，界面无滚动。

### Phase 2：Step 1 — 上传与分析
1. 实现 `ImageUploadZone` 组件
2. 实现 `AnalysisForm` 组件（产品名、卖点增删改、场景勾选、风格关键词）
3. 实现 `analyzer.ts`（Gemini Vision 分析 + 本地兜底）
4. 实现 `/api/ai-studio/analyze` API
5. 打通 Step 1 完整流程：上传 → 分析 → 编辑 → 下一步

**验收标准**：上传商品图后 3 秒内看到可编辑的分析档案，分析失败时有兜底模板。

### Phase 3：Step 2 — 配置生成
1. 实现 `StrategyCards`（智能全套 / 直接生成 / 仅换背景）
2. 实现 `SceneSelector`（图标卡片多选）
3. 实现 `AddonSwitches`（扩图/高清化/水印）
4. 实现 `PresetButtonGroup`（4 个预设）
5. 实现 `prompt-builder.ts` 和 `scene-templates.ts`

**验收标准**：选择预设后所有选项自动更新，点击"开始生成"能构建出正确的 TaskQueue payload。

### Phase 4：Step 3 — 生成与结果 + Pipeline
1. 在 `TaskProcessor` 中新增 `AI_STUDIO_GENERATION` case
2. 实现 `pipeline-executor.ts`（总控）
3. 实现 `provider-router.ts`（多 Provider failover）
4. 实现 `matting.ts`（抠图）
5. 实现 `bg-generator.ts`（背景生成）
6. 实现 `composer.ts`（合成）
7. 实现 `Step3Result`（进度面板 + 结果网格 + 单图操作）

**验收标准**：完整跑通一次生成流程，从上传商品图到看到 4 张结果图。

### Phase 5：任务中心 + 持久化
1. 实现 `/tasks` 任务中心页面
2. 新增 `AiStudioTaskRecord` Prisma 模型
3. 实现"保存到任务中心"功能
4. 实现"从任务中心载入工作台"功能

**验收标准**：任务可以保存、在任务中心查看、重新载入编辑。

### Phase 6：编辑器与风格复刻（可选，后续迭代）
1. 实现 `ImageEditorModal`（Inpaint + Canvas）
2. 实现风格复刻（结果页"换风格"功能）

---

## 13. 风险与注意事项

1. **ec-visual 后端 400KB 单文件**：核心逻辑高度耦合，移植 `buildWorkflowPromptPlan`、`generateImageWithPreferredProvider`、`maybeAutoMatteProject` 时需要仔细提取边界情况。
2. **Gemini Vision 不稳定性**：分析接口可能超时或返回不符合预期的 JSON，必须有完善的降级（本地模板）和重试机制。
3. **Jimeng API 并发限制**：`generateBatch` 并发控制必须准确，Jimeng 并发为 1，否则会被限流。
4. **Canvas 合成性能**：`composer.ts` 在服务器端使用 Node.js Canvas，注意内存占用和图片尺寸控制。
5. **多任务状态管理复杂度**：`useAiStudioStore` 需要处理任务切换时的事件监听（轮询器）正确启停，避免内存泄漏。
6. **图片存储成本**：一次生成 4-9 张图，加上中间产物（抠图、背景），存储量较大，需要定期清理或限制保留时长。

---

## 14. 技术决策记录

| 决策 | 选项 A | 选项 B | 选择 | 理由 |
|------|--------|--------|------|------|
| 入口方式 | 新增 Workspace Tab | 独立全屏页面 `/ai-studio` | **B** | 交互模式完全不同，独立页面更自由 |
| Prompt 规划 | Gemini Vision + 本地兜底 | 纯本地模板 | **A** | 保留 ec-visual 核心竞争力 |
| Provider 选择 | 用户自选 | 多 Provider Failover | **先做 B，后续加 A** | 利用现有架构，快速验证 |
| 风格复刻位置 | 独立 Tab | 结果页操作 | **结果页操作** | 使用场景是结果页的二次操作 |
| 任务持久化 | 仅内存 | 数据库持久化 | **Phase 1-4 仅内存，Phase 5 加数据库** | MVP 先跑通，再考虑归档 |
| 编辑器位置 | 独立 Tab | 结果页通用弹窗 | **结果页通用弹窗** | 任何生成的图都可以编辑 |
