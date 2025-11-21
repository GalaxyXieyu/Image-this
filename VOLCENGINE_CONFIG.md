# 火山引擎配置说明

## 配置方式

系统现在支持从**用户设置**读取火山引擎配置，不再依赖环境变量。

### 1. 在设置页面配置

1. 访问 `/settings` 页面
2. 找到"火山引擎（Volcengine）"配置卡片
3. 勾选"启用"
4. 填入您的 Access Key 和 Secret Key
5. 点击"保存设置"

### 2. 配置存储

配置保存在浏览器的 `localStorage` 中，键名为 `imageProcessorConfig`。

```json
{
  "volcengine": {
    "enabled": true,
    "accessKey": "AKLT...",
    "secretKey": "your-secret-key"
  }
}
```

### 3. 配置优先级

服务端 API 会按以下优先级读取配置：

1. **用户设置**（从前端传递）- 优先
2. **环境变量**（.env 文件）- 回退方案

## 前端使用

### 获取配置

```typescript
import { getVolcengineConfig, isVolcengineConfigured } from '@/lib/config-helper';

// 检查是否已配置
if (!isVolcengineConfigured()) {
  alert('请先在设置页面配置火山引擎');
  return;
}

// 获取配置
const volcengineConfig = getVolcengineConfig();
```

### 调用 API 时传递配置

```typescript
// 一键工作流
const response = await fetch('/api/workflow/one-click', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl,
    referenceImageUrl,
    volcengineConfig: getVolcengineConfig(), // 传递配置
    // ... 其他参数
  })
});

// 创建任务
await prisma.taskQueue.create({
  data: {
    type: 'BACKGROUND_REMOVAL',
    inputData: JSON.stringify({
      imageUrl,
      referenceImageUrl,
      volcengineConfig: getVolcengineConfig(), // 传递配置
    }),
    // ... 其他字段
  }
});
```

## 错误处理

如果用户未配置火山引擎，API 会返回友好的错误信息：

```
VOLCENGINE_NOT_CONFIGURED:请先在设置页面配置火山引擎 Access Key 和 Secret Key
```

前端应该捕获此错误并引导用户去设置页面：

```typescript
try {
  // 调用 API
} catch (error) {
  if (error.message.includes('VOLCENGINE_NOT_CONFIGURED')) {
    if (confirm('请先配置火山引擎。是否前往设置页面？')) {
      router.push('/settings');
    }
  }
}
```

## 调试日志

现在所有火山引擎 API 调用都会输出详细日志：

- `[即梦API] 使用配置 - AccessKey: AKLT...` - 显示使用的 Access Key 前缀
- `[即梦API] HTTP状态码: 401 Unauthorized` - HTTP 响应状态
- `[即梦API] 原始响应: {...}` - 完整的 API 响应
- `[即梦API] API返回错误: {...}` - 错误详情（包括 code 和 message）
- `[即梦API] 捕获异常: {...}` - 异常堆栈信息

## 迁移指南

### 从环境变量迁移

如果您之前使用环境变量配置：

1. 保持 `.env` 文件中的配置（作为回退）
2. 在设置页面重新配置一次
3. 用户配置会优先使用

### 多用户支持

每个用户可以配置自己的火山引擎账号，配置保存在各自的浏览器中。

## 安全性

- 配置保存在浏览器 localStorage，不会发送到服务器存储
- 每次 API 调用时从前端传递配置
- Secret Key 在设置页面使用 `type="password"` 隐藏显示
