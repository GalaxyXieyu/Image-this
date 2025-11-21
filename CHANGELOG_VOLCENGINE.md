# 火山引擎配置系统改造 - 更新日志

## 改造目标

将火山引擎配置从环境变量迁移到用户设置系统，支持每个用户使用自己的 API 密钥。

## 完成的修改

### 1. 后端 API 层

#### `src/app/api/jimeng/service.ts`
- ✅ 修改 `callJimengAPI` 函数签名，接受 `accessKey` 和 `secretKey` 参数
- ✅ 修改 `generateWithJimeng` 函数，接受可选的 `volcengineConfig` 参数
- ✅ 配置优先级：用户设置 > 环境变量
- ✅ 修复 Authorization 头使用正确的 `accessKey`（之前硬编码使用 `process.env`）
- ✅ 添加详细日志：
  - 请求 URL 和参数
  - HTTP 状态码
  - 原始 API 响应（前 500 字符）
  - 完整错误对象（包括 code、message、stack）
  - 重试信息

#### `src/app/api/tasks/worker/route.ts`
- ✅ 修改 `processBackgroundRemoval` 方法，从 `inputData` 读取 `volcengineConfig`
- ✅ 修改 `processOneClickWorkflow` 方法，从 `inputData` 读取 `volcengineConfig`
- ✅ 将配置传递给相应的服务函数
- ✅ 添加配置来源日志

#### `src/app/api/workflow/one-click/service.ts`
- ✅ 在 `OneClickWorkflowParams` 接口添加 `volcengineConfig` 字段
- ✅ 在 `executeOneClickWorkflow` 函数中提取并传递配置
- ✅ 将配置传递给 `generateWithJimeng` 调用

### 2. 工具库

#### `src/lib/config-helper.ts` (新建)
- ✅ `getUserConfig()` - 从 localStorage 读取完整配置
- ✅ `getVolcengineConfig()` - 获取火山引擎配置
- ✅ `isVolcengineConfigured()` - 检查是否已配置
- ✅ `getConfigMissingMessage()` - 获取友好的错误提示

### 3. 文档

#### `VOLCENGINE_CONFIG.md` (新建)
- ✅ 配置方式说明
- ✅ 前端使用示例
- ✅ 错误处理指南
- ✅ 调试日志说明
- ✅ 迁移指南

## 错误诊断增强

### 新增日志输出

1. **配置验证**
   ```
   [即梦API] 使用配置 - AccessKey: AKLT123456...
   [即梦服务] 使用配置源: 用户设置
   ```

2. **网络请求**
   ```
   [fetchWithRetry] 尝试 1/3, 超时: 60000ms
   [fetchWithRetry] 请求成功: 200
   ```

3. **API 响应**
   ```
   [即梦API] HTTP状态码: 401 Unauthorized
   [即梦API] 原始响应: {"code":50400,"message":"Access Denied: Internal Error",...}
   [即梦API] API返回错误: {
     httpStatus: 401,
     code: 50400,
     message: 'Access Denied: Internal Error',
     fullResponse: {...}
   }
   ```

4. **错误详情**
   ```
   [即梦API] 捕获异常 (尝试 2/4): {
     message: '即梦API调用失败: HTTP=401, code=50400, msg=Access Denied: Internal Error',
     stack: 'Error: ...',
     name: 'Error',
     cause: undefined
   }
   ```

## 使用指南

### 前端调用示例

```typescript
import { getVolcengineConfig, isVolcengineConfigured } from '@/lib/config-helper';

// 1. 检查配置
if (!isVolcengineConfigured()) {
  alert('请先在设置页面配置火山引擎');
  router.push('/settings');
  return;
}

// 2. 创建任务时传递配置
const volcengineConfig = getVolcengineConfig();

await prisma.taskQueue.create({
  data: {
    type: 'BACKGROUND_REMOVAL',
    inputData: JSON.stringify({
      imageUrl,
      referenceImageUrl,
      customPrompt,
      volcengineConfig, // 传递配置
    }),
    userId,
  }
});
```

### 错误处理示例

```typescript
try {
  // 调用 API
  const response = await fetch('/api/workflow/one-click', {
    method: 'POST',
    body: JSON.stringify({
      imageUrl,
      volcengineConfig: getVolcengineConfig(),
    })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.details || data.error);
  }
} catch (error) {
  if (error.message.includes('VOLCENGINE_NOT_CONFIGURED')) {
    // 引导用户去设置页面
    if (confirm('请先配置火山引擎。是否前往设置页面？')) {
      router.push('/settings');
    }
  } else {
    // 其他错误
    alert(`处理失败: ${error.message}`);
  }
}
```

## 待办事项

### 前端修改（需要手动完成）

- [ ] 修改所有调用火山引擎 API 的组件
- [ ] 在创建任务时传递 `volcengineConfig`
- [ ] 添加配置检查和友好提示
- [ ] 在设置页面添加配置测试功能

### 建议的前端修改位置

1. **工作空间组件** - 一键处理功能
2. **背景替换组件** - 背景替换功能
3. **任务创建** - 所有创建 `BACKGROUND_REMOVAL` 类型任务的地方

## 测试清单

- [ ] 在设置页面配置火山引擎密钥
- [ ] 测试一键工作流（背景替换功能）
- [ ] 测试单独的背景替换功能
- [ ] 验证错误日志是否完整输出
- [ ] 测试未配置时的错误提示
- [ ] 测试配置错误时的错误信息

## 常见问题

### Q: 为什么还是报 401 错误？
A: 请检查：
1. 是否在设置页面正确配置了 Access Key 和 Secret Key
2. 是否勾选了"启用"
3. 是否点击了"保存设置"
4. 前端代码是否传递了 `volcengineConfig`

### Q: 如何查看使用的是哪个配置？
A: 查看日志中的：
```
[即梦服务] 使用配置源: 用户设置
[即梦API] 使用配置 - AccessKey: AKLT...
```

### Q: 环境变量还有用吗？
A: 有用，作为回退方案。如果用户未配置，会自动使用环境变量。

## 版本信息

- **修改日期**: 2025-11-21
- **影响范围**: 火山引擎即梦 API 调用
- **向后兼容**: 是（保留环境变量支持）
