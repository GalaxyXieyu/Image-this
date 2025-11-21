# 图片处理器架构迁移指南

## 概述

本指南说明如何将现有的图片处理代码迁移到新的工厂模式架构。

## 新架构优势

### ✅ 已完成
- **工厂模式封装** - 统一的图片处理接口
- **多提供商支持** - 火山引擎、GPT、Gemini（预留）
- **配置系统重构** - 移除 MinIO，优化 UI
- **无缝切换** - 轻松切换不同提供商
- **易于扩展** - 添加新提供商只需实现接口

### 🎯 核心改进
1. **移除 MinIO 配置** - 简化配置项
2. **统一接口** - 所有提供商实现相同接口
3. **配置管理** - 支持环境变量和 localStorage
4. **类型安全** - 完整的 TypeScript 类型定义

## 迁移步骤

### 1. 更新配置页面（已完成）

**旧配置:**
```typescript
{
  gptApiUrl: '',
  gptApiKey: '',
  qwenApiKey: '',
  minioEndpoint: '',
  minioAccessKey: '',
  minioSecretKey: '',
  minioBucketName: ''
}
```

**新配置:**
```typescript
{
  volcengineEnabled: false,
  volcengineAccessKey: '',
  volcengineSecretKey: '',
  gptEnabled: false,
  gptApiUrl: 'https://yunwu.ai',
  gptApiKey: '',
  geminiEnabled: false,
  geminiApiKey: '',
  geminiProjectId: ''
}
```

### 2. 迁移 API 路由

#### 示例：画质增强 API

**旧代码:**
```typescript
// src/app/api/volcengine/enhance/route.ts
import { enhanceWithVolcengine } from '@/app/api/volcengine/service';

export async function POST(request: Request) {
  // ... 认证和参数解析
  
  const result = await enhanceWithVolcengine(
    userId,
    imageBase64,
    resolutionBoundary,
    enableHdr,
    enableWb,
    resultFormat,
    jpgQuality
  );
  
  return NextResponse.json(result);
}
```

**新代码:**
```typescript
// src/app/api/volcengine/enhance/route.ts
import { ImageProcessorFactory, ImageProvider } from '@/lib/image-processor';
import { initializeImageProcessor } from '@/lib/image-processor/init';

export async function POST(request: Request) {
  // 确保工厂已初始化
  initializeImageProcessor();
  
  // ... 认证和参数解析
  
  // 获取处理器
  const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);
  
  // 执行处理
  const result = await processor.enhance!(userId, imageBase64, {
    resolutionBoundary,
    enableHdr,
    enableWb,
    resultFormat,
    jpgQuality
  });
  
  return NextResponse.json(result);
}
```

### 3. 迁移工作流代码

#### 示例：一键处理工作流

**旧代码:**
```typescript
import { enhanceWithVolcengine, outpaintWithVolcengine } from '@/app/api/volcengine/service';

// 画质增强
const enhanceResult = await enhanceWithVolcengine(userId, imageBase64);

// 智能扩图
const outpaintResult = await outpaintWithVolcengine(userId, enhanceResult.imageData);
```

**新代码:**
```typescript
import { ImageProcessorFactory, ImageProvider } from '@/lib/image-processor';
import { initializeImageProcessor } from '@/lib/image-processor/init';

// 初始化
initializeImageProcessor();

// 获取处理器
const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);

// 画质增强
const enhanceResult = await processor.enhance!(userId, imageBase64);

// 智能扩图
const outpaintResult = await processor.outpaint!(userId, enhanceResult.imageData);
```

### 4. 支持多提供商切换

**动态切换示例:**
```typescript
import { ImageProcessorFactory, ImageProvider } from '@/lib/image-processor';

// 根据用户配置或业务逻辑选择提供商
const providerType = userConfig.preferredProvider || ImageProvider.VOLCENGINE;

try {
  const processor = ImageProcessorFactory.getProcessor(providerType);
  const result = await processor.enhance!(userId, imageBase64);
} catch (error) {
  // 如果首选提供商不可用，尝试备用提供商
  const availableProviders = ImageProcessorFactory.getAvailableProviders();
  if (availableProviders.length > 0) {
    const fallbackProcessor = ImageProcessorFactory.getProcessor(availableProviders[0]);
    const result = await fallbackProcessor.enhance!(userId, imageBase64);
  }
}
```

## 需要迁移的文件

### 高优先级
- [ ] `/src/app/api/volcengine/enhance/route.ts`
- [ ] `/src/app/api/volcengine/outpaint/route.ts`
- [ ] `/src/app/api/workflow/one-click/route.ts`
- [ ] `/src/app/api/tasks/worker/route.ts`

### 中优先级
- [ ] `/src/app/api/gpt/background-replace/route.ts`
- [ ] `/src/app/api/gpt/generate/route.ts`

### 低优先级（可选）
- [ ] 其他使用图片处理的组件

## 环境变量更新

### 旧环境变量
```bash
# 可以移除
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_NAME=
```

### 新环境变量
```bash
# 火山引擎
VOLCENGINE_ACCESS_KEY=your_access_key
VOLCENGINE_SECRET_KEY=your_secret_key

# GPT
GPT_API_URL=https://yunwu.ai
GPT_API_KEY=sk-xxx

# Gemini（预留）
GEMINI_API_KEY=your_api_key
GEMINI_PROJECT_ID=your_project_id
```

## 测试清单

### 配置页面测试
- [ ] 访问 `/settings` 页面
- [ ] 验证火山引擎配置显示正常
- [ ] 验证 GPT 配置显示正常
- [ ] 验证 Gemini 配置显示正常（虚线边框）
- [ ] 测试启用/禁用开关
- [ ] 测试保存配置功能
- [ ] 验证配置保存到 localStorage

### API 测试
- [ ] 测试画质增强 API
- [ ] 测试智能扩图 API
- [ ] 测试背景替换 API
- [ ] 测试工作流 API
- [ ] 验证错误处理

### 集成测试
- [ ] 测试提供商切换
- [ ] 测试配置加载（环境变量 + localStorage）
- [ ] 测试多提供商并发使用

## 回滚计划

如果迁移出现问题，可以：

1. **保留旧代码** - 旧的 service 文件仍然存在
2. **快速回滚** - 恢复旧的 API 路由代码
3. **渐进式迁移** - 一次迁移一个 API

## 后续优化

### 短期（1-2周）
- [ ] 完成所有 API 路由迁移
- [ ] 添加单元测试
- [ ] 优化错误处理

### 中期（1个月）
- [ ] 实现 GPT 提供商的完整功能
- [ ] 添加提供商健康检查
- [ ] 实现自动故障转移

### 长期（2-3个月）
- [ ] 实现 Gemini 提供商
- [ ] 添加性能监控
- [ ] 实现智能提供商选择

## 常见问题

### Q: 旧配置会丢失吗？
A: 不会。新配置使用不同的 localStorage 键（`imageProcessorConfig`），旧配置（`apiSettings`）仍然保留。

### Q: 如何测试新架构？
A: 可以先在开发环境测试，使用环境变量配置提供商，验证功能正常后再迁移生产环境。

### Q: 如何添加新的提供商？
A: 参考 `src/lib/image-processor/README.md` 中的"扩展新提供商"章节。

### Q: 性能会受影响吗？
A: 不会。工厂模式只在初始化时有轻微开销，运行时性能与直接调用相同。

## 联系支持

如有问题，请查看：
- 📖 架构文档: `src/lib/image-processor/README.md`
- 🔧 配置管理: `src/lib/image-processor/config.ts`
- 🏭 工厂实现: `src/lib/image-processor/factory.ts`
