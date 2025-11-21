# AI 模型选择功能实现文档

## 功能概述

为背景替换和一键增强功能添加了 AI 模型选择功能，用户可以选择使用：
- **即梦 (Jimeng)** - 默认推荐，已完全实现
- **GPT-4 Vision** - 预留接口，待实现
- **Gemini** - 预留接口，待实现

## 实现的功能模块

### 1. 背景替换 (Background Removal)
- 位置：`background` 标签页
- 支持选择 AI 模型
- 当前只有即梦可用，GPT 和 Gemini 显示为"即将支持"

### 2. 图像高清化 (Image Upscaling)
- 位置：`upscaling` 标签页
- 支持选择 AI 模型
- 当前所有模型都使用火山引擎的画质增强服务

### 3. 一键增强 (One-Click Workflow)
- 位置：`one-click` 标签页
- 支持选择 AI 模型
- 用于背景替换和画质增强步骤

## 修改的文件

### 前端组件

#### 1. `src/components/workspace/ParameterSettings.tsx`
**修改内容：**
- 添加 `aiModel` 和 `setAiModel` props
- 在背景替换、图像高清化、一键增强标签页添加 AI 模型选择下拉框
- 提供三个选项：即梦（推荐）、GPT-4 Vision、Gemini（即将支持）

**关键代码：**
```tsx
interface ParameterSettingsProps {
  activeTab: ActiveTab;
  outputResolution: string;
  setOutputResolution: (value: string) => void;
  aiModel?: string;
  setAiModel?: (value: string) => void;
}
```

#### 2. `src/app/workspace/page.tsx`
**修改内容：**
- 添加 `aiModel` 状态管理：`const [aiModel, setAiModel] = useState('jimeng')`
- 将 `aiModel` 传递给 `ParameterSettings` 组件
- 将 `aiModel` 传递给 `useImageProcessing` hook

### 业务逻辑层

#### 3. `src/hooks/useImageProcessing.ts`
**修改内容：**
- 在 `UseImageProcessingProps` 接口添加 `aiModel?: string`
- 在所有任务数据中包含 `aiModel` 参数
- 影响的函数：
  - `handleUpscaling` - 图像高清化
  - `handleOneClick` - 一键增强
  - `handleBackgroundReplace` - 背景替换

#### 4. `src/app/api/tasks/worker/route.ts`
**修改内容：**
- 在 `processOneClickWorkflow` 中提取 `aiModel` 参数
- 在 `processBackgroundRemoval` 中提取 `aiModel` 参数并添加模型选择逻辑
- 在 `processImageUpscaling` 中提取 `aiModel` 参数
- 将 `aiModel` 传递给工作流服务

**关键逻辑：**
```typescript
// 根据选择的 AI 模型调用不同的服务
if (aiModel === 'jimeng') {
  const { generateWithJimeng } = await import('@/app/api/jimeng/service');
  result = await generateWithJimeng(...);
} else if (aiModel === 'gpt') {
  throw new Error('GPT-4 Vision 背景替换功能即将推出');
} else if (aiModel === 'gemini') {
  throw new Error('Gemini 背景替换功能即将推出');
}
```

#### 5. `src/app/api/workflow/one-click/service.ts`
**修改内容：**
- 在 `OneClickWorkflowParams` 接口添加 `aiModel?: string`
- 在工作流执行函数中提取 `aiModel` 参数（默认值为 'jimeng'）
- 在背景替换步骤添加模型选择逻辑
- 在画质增强步骤添加模型选择逻辑（当前所有模型都使用火山引擎）
- 在元数据中保存 `aiModel` 信息

**关键逻辑：**
```typescript
// 步骤1：背景替换
if (enableBackgroundReplace && referenceImageUrl) {
  console.log(`=== 步骤1/4：开始背景替换 (使用 ${aiModel}) ===`);
  
  if (aiModel === 'jimeng') {
    const result = await generateWithJimeng(...);
    processedImageUrl = result.imageData;
  } else if (aiModel === 'gpt') {
    throw new Error('GPT-4 Vision 背景替换功能即将推出');
  } else if (aiModel === 'gemini') {
    throw new Error('Gemini 背景替换功能即将推出');
  }
}
```

### 图像处理器层

#### 6. `src/lib/image-processor/providers/gpt.ts`
**修改内容：**
- 添加 `enhance` 方法占位符
- 所有方法都抛出 "not implemented yet" 错误

#### 7. `src/lib/image-processor/providers/gemini.ts`
**修改内容：**
- 添加 `backgroundReplace` 方法占位符
- 添加 `enhance` 方法占位符
- 所有方法都抛出 "not implemented yet" 错误

## 数据流

```
用户选择 AI 模型
    ↓
ParameterSettings 组件更新 aiModel 状态
    ↓
workspace/page.tsx 管理 aiModel 状态
    ↓
useImageProcessing hook 将 aiModel 包含在任务数据中
    ↓
创建任务并发送到后端
    ↓
worker/route.ts 提取 aiModel 参数
    ↓
根据 aiModel 调用相应的服务
    ↓
one-click/service.ts 执行工作流
    ↓
调用具体的 AI 服务（即梦/GPT/Gemini）
```

## 用户界面

### 背景替换标签页
```
┌─────────────────────────────────────┐
│ AI 模型选择                          │
│ ┌─────────────────────────────────┐ │
│ │ 即梦 (推荐)                  ▼  │ │
│ └─────────────────────────────────┘ │
│ 选择用于背景替换的 AI 模型           │
│                                     │
│ 自定义提示词（可选）                 │
│ ┌─────────────────────────────────┐ │
│ │ 描述期望的背景效果...            │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 图像高清化标签页
```
┌──────────────────┬──────────────────┐
│ 高清化倍数        │ AI 模型选择       │
│ ┌──────────────┐ │ ┌──────────────┐ │
│ │ 2x        ▼  │ │ │ 即梦 (推荐) ▼│ │
│ └──────────────┘ │ └──────────────┘ │
└──────────────────┴──────────────────┘
```

### 一键增强标签页
```
┌─────────────────────────────────────┐
│ X轴扩展倍数 │ Y轴扩展倍数 │ 高清化倍数│
│ ┌─────────┐ │ ┌─────────┐ │ ┌──────┐│
│ │ 2.0     │ │ │ 2.0     │ │ │ 2x ▼││
│ └─────────┘ │ └─────────┘ │ └──────┘│
│                                     │
│ AI 模型选择                          │
│ ┌─────────────────────────────────┐ │
│ │ 即梦 (推荐)                  ▼  │ │
│ └─────────────────────────────────┘ │
│ 用于背景替换和画质增强               │
└─────────────────────────────────────┘
```

## 当前实现状态

### ✅ 已实现
- 即梦 (Jimeng) 模型
  - 背景替换功能
  - 图像生成功能
  - 完整的工作流集成

### 🚧 待实现
- GPT-4 Vision 模型
  - 背景替换功能
  - 画质增强功能
  - 图像生成功能

- Gemini 模型
  - 背景替换功能
  - 画质增强功能
  - 图像生成功能

## 扩展指南

### 如何添加新的 AI 模型

#### 1. 实现服务层
在 `src/app/api/[model-name]/service.ts` 中实现具体的 API 调用逻辑。

#### 2. 更新 Worker 路由
在 `src/app/api/tasks/worker/route.ts` 中添加模型选择逻辑：

```typescript
if (aiModel === 'your-model') {
  const { yourModelFunction } = await import('@/app/api/your-model/service');
  result = await yourModelFunction(...);
}
```

#### 3. 更新工作流服务
在 `src/app/api/workflow/one-click/service.ts` 中添加相应的处理逻辑。

#### 4. 实现图像处理器
在 `src/lib/image-processor/providers/your-model.ts` 中实现 `IImageProcessor` 接口。

#### 5. 更新 UI
在 `src/components/workspace/ParameterSettings.tsx` 中添加新的选项：

```tsx
<option value="your-model">Your Model Name</option>
```

## 注意事项

1. **默认模型**：所有地方的默认值都是 `'jimeng'`
2. **错误处理**：未实现的模型会抛出友好的错误消息
3. **向后兼容**：`aiModel` 参数是可选的，默认使用即梦
4. **日志记录**：所有处理步骤都会记录使用的 AI 模型
5. **元数据保存**：`aiModel` 会保存在处理记录的元数据中

## 测试建议

1. **功能测试**
   - 测试每个标签页的模型选择功能
   - 验证默认模型是否正确
   - 测试模型切换是否正常工作

2. **错误处理测试**
   - 尝试使用未实现的模型（GPT/Gemini）
   - 验证错误消息是否友好
   - 确认错误不会导致系统崩溃

3. **集成测试**
   - 测试完整的一键增强工作流
   - 验证模型参数是否正确传递
   - 检查处理记录中的元数据

## 未来优化

1. **模型能力检测**：根据用户配置动态显示可用模型
2. **模型性能对比**：显示不同模型的处理时间和质量
3. **模型推荐**：根据任务类型推荐最佳模型
4. **批量处理**：支持不同图片使用不同模型
5. **模型配置**：允许用户配置每个模型的详细参数

## 相关文档

- [Next.js 技术架构指南](/.windsurf/rules/nextjs.md)
- [图像处理器 README](/src/lib/image-processor/README.md)
- [火山引擎配置文档](/VOLCENGINE_CONFIG.md)

---

**创建日期**: 2025-11-21  
**版本**: 1.0  
**作者**: AI Assistant
