# 火山引擎AI图像处理API集成说明

## 概述
已成功集成火山引擎AI图像处理服务：
- **即梦4.0图像生成**：支持文生图和图生图
- **智能扩图(Outpainting)**：支持智能扩展图像边界

## 配置

在`.env`文件中添加以下配置：

```bash
# 火山引擎即梦API配置
VOLCENGINE_ACCESS_KEY="AKLTYWNiZjUzOTNjYWYwNGFlNjk1Yjk1NmRkMzEyNGZhOTg"
VOLCENGINE_SECRET_KEY="TlRabU9UWmpZalJoTWpnd05HRTJZMkU1TURnNU1qUmlOREkxT0RaaE1UZw=="
ARK_API_KEY="AKLTYWNiZjUzOTNjYWYwNGFlNjk1Yjk1NmRkMzEyNGZhOTg"

# Superbed图床配置
SUPERBED_TOKEN="00fbe01340604063b1f59aedc0481ddc"
```

## API端点

### 1. POST `/api/jimeng/generate`

生成AI图像（支持文生图和图生图）

**请求参数：**
```json
{
  "prompt": "图像描述文本",
  "referenceImage": "base64编码的参考图片（可选）",
  "width": 2048,
  "height": 2048,
  "seed": 123456,
  "projectId": "项目ID（可选）"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "记录ID",
    "imageUrl": "生成的图片URL",
    "originalUrl": "原始参考图URL",
    "result": {
      "binary_data_base64": ["base64图片数据"],
      "time_elapsed": "处理时间"
    }
  },
  "message": "即梦图像生成成功"
}
```

### 2. POST `/api/volcengine/outpaint`

智能扩图（扩展图像边界）

**请求参数：**
```json
{
  "imageUrl": "base64编码的图片",
  "prompt": "扩展图像，保持风格一致",
  "top": 0.1,
  "bottom": 0.1,
  "left": 0.1,
  "right": 0.1,
  "maxHeight": 1920,
  "maxWidth": 1920,
  "projectId": "项目ID（可选）"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "记录ID",
    "imageData": "扩图后的base64数据",
    "imageSize": 文件大小,
    "minioUrl": "MinIO存储URL",
    "expandRatio": {
      "top": 0.1,
      "bottom": 0.1,
      "left": 0.1,
      "right": 0.1
    }
  },
  "message": "图像智能扩图成功"
}
```

## 技术实现

### 1. 图片上传流程
- 参考图片先上传到Superbed图床获取公网URL
- 使用公网URL调用即梦API（即梦API无法访问localhost）
- 生成的图片保存到MinIO

### 2. 即梦API调用
- 使用HMAC-SHA256签名认证
- 同步返回Base64图片数据
- 支持自定义分辨率（跳过扩图步骤）
- 处理时间约20-25秒

### 3. 智能扩图API调用
- 使用HMAC-SHA256签名认证
- 同步返回Base64图片数据
- 支持自定义扩展比例和最大尺寸
- 处理时间约3-5秒

### 4. 核心文件
- `/src/app/api/jimeng/generate/route.ts` - 即梦图像生成API
- `/src/app/api/volcengine/outpaint/route.ts` - 智能扩图API
- `/src/lib/superbed-upload.ts` - Superbed图床上传服务
- `/src/lib/storage.ts` - MinIO存储服务

## 特性

### 即梦图像生成
✅ 支持2048x2048高分辨率生成
✅ 支持参考图片（图生图）
✅ 自动上传到图床获取公网URL
✅ 同步返回结果，无需轮询

### 智能扩图
✅ 支持四个方向独立扩展比例
✅ 自动保持原图风格一致
✅ 支持自定义提示词引导扩展内容
✅ 最大支持1920x1920输出

### 通用特性
✅ 完整的错误处理和日志记录
✅ 数据库记录管理
✅ MinIO存储集成

## 注意事项

1. **图床限制**：Superbed免费版有上传限制，生产环境建议使用阿里云OSS
2. **处理时间**：即梦API处理时间较长（20-25秒），建议前端显示加载状态
3. **分辨率**：支持多种分辨率，但2048x2048效果最佳
4. **参考图片**：支持多张参考图片，通过image_urls数组传递

## API对比

| 特性 | 即梦图像生成 | 智能扩图 |
|------|-------------|---------|
| 功能 | 文生图/图生图 | 扩展图像边界 |
| 分辨率 | 直接生成2048x2048 | 最大1920x1920 |
| 处理时间 | 20-25秒 | 3-5秒 |
| 参考图片 | 支持 | 必需 |
| 返回方式 | 同步 | 同步 |
| 主要用途 | 创建新图像 | 扩展现有图像 |

## 测试

API已通过完整测试验证：
- ✅ 签名认证成功
- ✅ 图片上传成功
- ✅ 图像生成成功
- ✅ 数据库记录正常
