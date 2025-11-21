# 火山引擎扩图 Base64 编码问题修复

## 问题描述

在一键增强工作流中，当执行扩图步骤时出现以下错误：

```
扩图API失败: code=50207, msg=Image Decode Error: image format unsupported: base64 decode failed. err=illegal base64 data at input byte 22
```

## 根本原因

1. **背景替换步骤**返回的是 base64 格式的图片数据（`data:image/jpeg;base64,...`）
2. **扩图步骤**直接将这个 base64 数据传递给火山引擎 API
3. Base64 数据可能包含换行符或其他非法字符，导致解码失败

## 解决方案

### 1. 修改扩图函数支持 URL 输入

**文件:** `src/app/api/volcengine/service.ts`

修改 `outpaintWithVolcengine` 函数：
- 参数名从 `imageBase64` 改为 `imageInput`（支持 base64 或 URL）
- 自动检测输入类型（URL 或 base64）
- 优先使用 `image_urls` 参数（推荐）
- 保留 `binary_data_base64` 作为备选

**优势:**
- ✅ URL 方式更稳定，避免 base64 编码问题
- ✅ 减少请求体大小
- ✅ 火山引擎自己下载图片，更可靠

### 2. 工作流中间结果转换为 URL

**文件:** `src/app/api/workflow/one-click/service.ts`

在背景替换完成后：
- 检测结果是否为 base64 格式
- 如果是，立即上传到本地存储获取 URL
- 将 URL 传递给后续的扩图步骤

**代码示例:**
```typescript
// 如果结果是 base64，先上传为 URL
if (processedImageUrl.startsWith('data:image/')) {
  console.log('[背景替换] 结果是 base64，上传为 URL...');
  const { uploadBase64Image } = await import('@/lib/storage');
  processedImageUrl = await uploadBase64Image(
    processedImageUrl,
    `bg-replace-${Date.now()}.jpg`
  );
  console.log(`[背景替换] 已上传: ${processedImageUrl.substring(0, 50)}...`);
}
```

## 火山引擎 API 支持的输入方式

### 方式1: URL（推荐）✅
```json
{
  "req_key": "i2i_outpainting",
  "image_urls": ["https://example.com/image.jpg"],
  "custom_prompt": "...",
  ...
}
```

### 方式2: Base64（备选）
```json
{
  "req_key": "i2i_outpainting",
  "binary_data_base64": ["iVBORw0KGgoAAAANSUhEUgAA..."],
  "custom_prompt": "...",
  ...
}
```

## 测试验证

1. 启动开发服务器
2. 执行一键增强工作流（启用背景替换 + 扩图）
3. 观察日志输出：
   ```
   [背景替换] 结果是 base64，上传为 URL...
   [背景替换] 已上传: https://...
   [火山扩图] 使用 URL 输入: https://...
   ```
4. 确认扩图步骤成功完成

## 相关文件

- `src/app/api/volcengine/service.ts` - 火山引擎服务（扩图、增强）
- `src/app/api/workflow/one-click/service.ts` - 一键增强工作流
- `src/lib/storage.ts` - 本地存储上传

## 注意事项

- 增强函数 `enhanceWithVolcengine` 已经使用 URL 方式（通过 Superbed），无需修改
- 所有中间结果都应该转换为 URL，避免 base64 传递问题
- URL 方式对网络要求更高，确保火山引擎可以访问图片 URL

## 日期

2025-11-21
