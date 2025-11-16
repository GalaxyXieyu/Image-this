# Worker测试指南

## 当前状态

✅ **扩图功能已修复**
- Worker现在直接调用 `outpaintWithVolcengine()` 服务函数
- 避免了HTTP超时问题
- 处理时间：约4-5秒

## 测试步骤

### 1. 测试扩图功能

1. 访问 `/workspace` 页面
2. 上传一张图片
3. 选择"扩图"功能
4. 设置扩展比例（如 xScale=2, yScale=2）
5. 点击"开始处理"
6. **不要在处理过程中删除任务**
7. 等待约5秒查看结果

### 2. 查看日志

Worker日志应该显示：
```
[图像扩展] 任务ID: xxx
[图像扩展] 使用火山引擎扩图服务
[图像扩展] 原始比例 - xScale: 2, yScale: 2
[图像扩展] 转换后扩展比例 - 上:0.5 下:0.5 左:0.5 右:0.5
[火山扩图服务] 开始处理，用户ID: xxx
[火山扩图服务] 发送请求到火山引擎...
[火山扩图服务] 收到响应，耗时: 4.xx秒
[火山扩图服务] 处理完成，总耗时: 4.xx秒
[图像扩展] 处理成功
```

## 注意事项

### ⚠️ 不要在处理过程中删除任务

之前的错误日志显示：
```
DELETE /api/tasks/cmi149eku00011ls10zs54m7a 200 in 1811ms
```

这会导致Worker后续更新任务时找不到记录，出现：
```
Record to update not found
```

### ✅ 正确的流程

1. 创建任务
2. Worker自动处理
3. 等待完成（不要删除）
4. 查看结果

## 环境变量检查

确保 `.env` 文件包含：
```bash
AccessKey="AKLTYWNiZjUzOTNjYWYwNGFlNjk1Yjk1NmRkMzEyNGZhOTg"
SecretKey="TlRabU9UWmpZalJoTWpnd05HRTJZMkU1TURnNU1qUmlOREkxT0RaaE1UZz="
SUPERBED_TOKEN="00fbe01340604063b1f59aedc0481ddc"
```

## Redis说明

**当前项目不需要Redis**
- 使用Prisma + SQLite作为任务队列
- 任务状态存储在数据库中
- Worker通过轮询数据库获取任务

如果未来需要Redis，可以考虑用于：
- 任务队列（BullMQ）
- 缓存
- 实时通知

但目前的实现已经足够稳定。
