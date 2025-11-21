# 配置系统迁移完成 - 所有服务

## 迁移概述

所有 AI 服务现在都从**用户设置**读取配置，不再依赖环境变量（环境变量作为回退方案保留）。

## 已完成的服务迁移

### 1. ✅ 火山引擎即梦 (Jimeng)
- **文件**: `src/app/api/jimeng/service.ts`
- **函数**: `generateWithJimeng()`
- **配置参数**: `volcengineConfig?: { accessKey: string; secretKey: string }`
- **用途**: 背景替换、图像生成

### 2. ✅ 火山引擎画质增强 (Volcengine Enhance)
- **文件**: `src/app/api/volcengine/service.ts`
- **函数**: `enhanceWithVolcengine()`
- **配置参数**: `volcengineConfig?: { accessKey: string; secretKey: string }`
- **用途**: 智能画质增强、高清化

### 3. ✅ 火山引擎扩图 (Volcengine Outpaint)
- **文件**: `src/app/api/volcengine/service.ts`
- **函数**: `outpaintWithVolcengine()`
- **配置参数**: `volcengineConfig?: { accessKey: string; secretKey: string }`
- **用途**: 智能扩图

### 4. ✅ 通义千问扩图 (Qwen Outpaint)
- **文件**: `src/app/api/qwen/service.ts`
- **函数**: `outpaintWithQwen()`
- **配置参数**: `qwenConfig?: { apiKey: string }`
- **说明**: 使用 GPT 配置中的 API Key
- **用途**: 图像扩展

### 5. ✅ 一键工作流 (One-Click Workflow)
- **文件**: `src/app/api/workflow/one-click/service.ts`
- **函数**: `executeOneClickWorkflow()`
- **配置参数**: `volcengineConfig?: { accessKey: string; secretKey: string }`
- **说明**: 已传递配置给所有子服务
- **用途**: 一键处理（背景替换 + 扩图 + 画质增强 + 水印）

### 6. ✅ Worker 任务处理器
- **文件**: `src/app/api/tasks/worker/route.ts`
- **修改内容**:
  - `processBackgroundRemoval()` - 从 inputData 读取 `volcengineConfig`
  - `processOneClickWorkflow()` - 从 inputData 读取 `volcengineConfig`

## 配置助手工具

### 新增函数 (`src/lib/config-helper.ts`)

```typescript
// 火山引擎配置
getVolcengineConfig(): VolcengineConfig | undefined
isVolcengineConfigured(): boolean

// GPT 配置
getGPTConfig(): { apiUrl: string; apiKey: string } | undefined
isGPTConfigured(): boolean

// Qwen 配置（使用 GPT 配置）
getQwenConfig(): { apiKey: string } | undefined
isQwenConfigured(): boolean

// 友好提示
getConfigMissingMessage(service): string
```

## 配置优先级

所有服务遵循统一的配置优先级：

1. **用户设置** (localStorage) - 最高优先级
2. **环境变量** (.env 文件) - 回退方案

## 错误提示标准化

所有服务使用统一的错误格式：

```
SERVICE_NOT_CONFIGURED:请先在设置页面配置 XXX
```

例如：
- `VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key`
- `QWEN_NOT_CONFIGURED:请先在设置页面配置 GPT API 密钥（通义千问使用 GPT 配置）`

## 日志增强

所有服务现在输出：
- 配置来源（用户设置 / 环境变量）
- Access Key 前缀（前 10 个字符）

示例：
```
[即梦服务] 使用配置源: 用户设置
[即梦API] 使用配置 - AccessKey: AKLT123456...
[火山增强] 使用配置源: 环境变量
[火山增强] AccessKey: AKLT789012...
```

## 前端使用指南

### 1. 获取配置

```typescript
import { 
  getVolcengineConfig, 
  getGPTConfig, 
  getQwenConfig,
  isVolcengineConfigured 
} from '@/lib/config-helper';

// 检查是否已配置
if (!isVolcengineConfigured()) {
  alert('请先在设置页面配置火山引擎');
  router.push('/settings');
  return;
}

// 获取配置
const volcengineConfig = getVolcengineConfig();
const gptConfig = getGPTConfig();
const qwenConfig = getQwenConfig();
```

### 2. 创建任务时传递配置

```typescript
// 背景替换任务
await prisma.taskQueue.create({
  data: {
    type: 'BACKGROUND_REMOVAL',
    inputData: JSON.stringify({
      imageUrl,
      referenceImageUrl,
      customPrompt,
      volcengineConfig: getVolcengineConfig(), // 传递配置
    }),
    userId,
  }
});

// 一键工作流任务
await prisma.taskQueue.create({
  data: {
    type: 'ONE_CLICK_WORKFLOW',
    inputData: JSON.stringify({
      imageUrl,
      referenceImageUrl,
      enableBackgroundReplace: true,
      enableOutpaint: true,
      enableUpscale: true,
      volcengineConfig: getVolcengineConfig(), // 传递配置
    }),
    userId,
  }
});
```

### 3. 直接调用 API

```typescript
// 调用一键工作流 API
const response = await fetch('/api/workflow/one-click', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl,
    referenceImageUrl,
    volcengineConfig: getVolcengineConfig(), // 传递配置
  })
});
```

## 待办事项

### 前端修改（需要手动完成）

- [ ] 修改所有创建任务的组件，传递配置
- [ ] 修改所有直接调用 API 的组件，传递配置
- [ ] 添加配置检查和友好提示
- [ ] 在设置页面添加配置测试功能

### 建议修改的组件

1. **工作空间组件** - 一键处理功能
2. **背景替换组件** - 背景替换功能
3. **扩图组件** - 扩图功能
4. **画质增强组件** - 画质增强功能

## 测试清单

- [ ] 在设置页面配置所有服务的密钥
- [ ] 测试一键工作流（所有步骤）
- [ ] 测试单独的背景替换
- [ ] 测试单独的扩图
- [ ] 测试单独的画质增强
- [ ] 验证未配置时的错误提示
- [ ] 验证配置错误时的错误信息
- [ ] 验证日志输出是否正确

## 兼容性说明

- ✅ **向后兼容**: 环境变量仍然有效（作为回退方案）
- ✅ **渐进式迁移**: 可以逐步迁移前端代码
- ✅ **零停机**: 不影响现有功能

## 配置示例

### localStorage 配置格式

```json
{
  "volcengine": {
    "enabled": true,
    "accessKey": "AKLT...",
    "secretKey": "your-secret-key"
  },
  "gpt": {
    "enabled": true,
    "apiUrl": "https://yunwu.ai",
    "apiKey": "sk-..."
  },
  "gemini": {
    "enabled": false,
    "apiKey": "",
    "projectId": ""
  }
}
```

### 环境变量（回退方案）

```bash
# 火山引擎
VOLCENGINE_ACCESS_KEY="AKLT..."
VOLCENGINE_SECRET_KEY="your-secret-key"

# GPT / Qwen
GPT_API_URL="https://yunwu.ai"
GPT_API_KEY="sk-..."
QWEN_API_KEY="sk-..."  # 可选，会使用 GPT_API_KEY

# Gemini（预留）
GEMINI_API_KEY="AI..."
```

## 版本信息

- **完成日期**: 2025-11-21
- **影响范围**: 所有 AI 服务
- **向后兼容**: 是
- **需要前端修改**: 是（传递配置参数）
