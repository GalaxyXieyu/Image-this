# Gemini API 设置指南

## 获取 Gemini API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/apikey)
2. 点击 "Create API Key" 按钮
3. 选择或创建一个 Google Cloud 项目
4. 复制生成的 API Key

## 配置方式

### 方式 1: 环境变量（推荐用于测试）

```bash
export GEMINI_API_KEY="your-api-key-here"
node test-gemini.mjs
```

### 方式 2: .env 文件（推荐用于开发）

在项目根目录的 `.env` 文件中添加：

```
GEMINI_API_KEY=your-api-key-here
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
```

### 方式 3: 通过 API 请求传入配置

在调用 API 时，可以在请求体中传入配置：

```json
{
  "originalImageUrl": "...",
  "referenceImageUrl": "...",
  "prompt": "...",
  "geminiConfig": {
    "apiKey": "your-api-key-here",
    "baseUrl": "https://generativelanguage.googleapis.com"
  }
}
```

## 测试 API

### 启动开发服务器

```bash
npm run dev
```

### 运行测试脚本

```bash
export GEMINI_API_KEY="your-api-key-here"
node test-gemini.mjs
```

## API 端点

- **URL**: `POST /api/gemini/background-replace`
- **必需参数**:
  - `originalImageUrl`: 目标图片（base64 或 URL）
  - `referenceImageUrl`: 参考图片（base64 或 URL）
- **可选参数**:
  - `prompt`: 自定义提示词
  - `geminiConfig`: 配置对象（apiKey, baseUrl）
  - `userId`: 用户ID（serverCall=true 时需要）
  - `serverCall`: 是否为服务端调用

## 响应格式

```json
{
  "success": true,
  "data": {
    "id": "image-id",
    "response": "API 返回的文本响应",
    "success": true
  },
  "message": "Gemini 图像处理成功"
}
```

## 常见问题

### Q: 如何获取免费的 Gemini API Key？
A: 访问 [Google AI Studio](https://aistudio.google.com/apikey)，可以免费获取 API Key，每月有免费配额。

### Q: API Key 过期了怎么办？
A: 在 Google AI Studio 中重新生成新的 API Key。

### Q: 支持哪些图片格式？
A: 支持 JPEG、PNG、GIF、WebP 等常见格式。

### Q: 图片大小有限制吗？
A: Gemini API 对单个图片的大小有限制（通常为 20MB），但建议保持在 5MB 以下以获得最佳性能。
