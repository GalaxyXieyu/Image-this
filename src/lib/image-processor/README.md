# 图片处理器工厂模式

## 架构设计

采用工厂模式设计，支持多个图片处理提供商的无缝切换和扩展。

### 目录结构

```
image-processor/
├── types.ts              # 类型定义
├── factory.ts            # 工厂类
├── config.ts             # 配置管理
├── providers/            # 提供商实现
│   ├── volcengine.ts     # 火山引擎
│   ├── gpt.ts            # GPT
│   └── gemini.ts         # Gemini（预留）
└── index.ts              # 导出
```

## 使用示例

### 1. 初始化工厂

```typescript
import { ImageProcessorFactory, loadMergedConfig } from '@/lib/image-processor';

// 加载配置（合并环境变量和 localStorage）
const config = loadMergedConfig();

// 初始化工厂
ImageProcessorFactory.initialize(config);
```

### 2. 使用火山引擎进行画质增强

```typescript
import { ImageProcessorFactory, ImageProvider } from '@/lib/image-processor';

// 获取火山引擎处理器
const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);

// 执行画质增强
const result = await processor.enhance!(userId, imageBase64, {
  resolutionBoundary: '1080p',
  enableHdr: true,
  enableWb: false,
  resultFormat: 1,
  jpgQuality: 95
});

console.log('处理结果:', result);
```

### 3. 使用火山引擎进行智能扩图

```typescript
const processor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);

const result = await processor.outpaint!(userId, imageBase64, {
  prompt: '扩展图像，保持风格一致',
  top: 0.1,
  bottom: 0.1,
  left: 0.1,
  right: 0.1,
  maxHeight: 1920,
  maxWidth: 1920
});
```

### 4. 切换提供商

```typescript
// 检查可用的提供商
const availableProviders = ImageProcessorFactory.getAvailableProviders();
console.log('可用提供商:', availableProviders);

// 根据需求切换提供商
const gptProcessor = ImageProcessorFactory.getProcessor(ImageProvider.GPT);
const volcProcessor = ImageProcessorFactory.getProcessor(ImageProvider.VOLCENGINE);
```

## 扩展新提供商

### 1. 创建提供商类

```typescript
// providers/new-provider.ts
import { IImageProcessor, ProcessResult } from '../types';

export class NewProviderProcessor implements IImageProcessor {
  constructor(private config: NewProviderConfig) {}

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    // 实现逻辑
  }

  // 实现其他方法...
}
```

### 2. 更新类型定义

```typescript
// types.ts
export enum ImageProvider {
  VOLCENGINE = 'volcengine',
  GPT = 'gpt',
  GEMINI = 'gemini',
  NEW_PROVIDER = 'new_provider', // 新增
}

export interface NewProviderConfig {
  enabled: boolean;
  apiKey: string;
  // 其他配置...
}

export interface ProvidersConfig {
  volcengine: VolcengineConfig;
  gpt: GPTConfig;
  gemini: GeminiConfig;
  newProvider: NewProviderConfig; // 新增
}
```

### 3. 更新工厂类

```typescript
// factory.ts
import { NewProviderProcessor } from './providers/new-provider';

static initialize(config: ProvidersConfig) {
  // ... 现有代码
  
  if (config.newProvider.enabled) {
    this.processors.set(ImageProvider.NEW_PROVIDER, new NewProviderProcessor(config.newProvider));
  }
}
```

### 4. 更新配置管理

```typescript
// config.ts
export const defaultConfig: ProvidersConfig = {
  // ... 现有配置
  newProvider: {
    enabled: false,
    apiKey: '',
  },
};
```

## 配置管理

### 环境变量

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

### localStorage 配置

配置保存在 `imageProcessorConfig` 键中：

```json
{
  "volcengine": {
    "enabled": true,
    "accessKey": "AKLT...",
    "secretKey": "xxx"
  },
  "gpt": {
    "enabled": true,
    "apiUrl": "https://yunwu.ai",
    "apiKey": "sk-xxx"
  },
  "gemini": {
    "enabled": false,
    "apiKey": "",
    "projectId": ""
  }
}
```

## 优势

1. **解耦**: 业务逻辑与具体提供商实现解耦
2. **可扩展**: 轻松添加新的提供商
3. **可切换**: 运行时动态切换提供商
4. **统一接口**: 所有提供商实现相同接口
5. **配置灵活**: 支持环境变量和 localStorage 配置
