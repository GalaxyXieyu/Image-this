# Windows 构建修复说明

## 修复的问题

### 1. **路径处理问题** ✅
- **问题**: Windows 打包后 `process.resourcesPath` 路径不正确
- **解决方案**: 
  - 使用 `app.isPackaged` 检测打包状态
  - 根据打包状态动态确定应用根目录
  - 支持开发模式和生产模式的不同路径结构

### 2. **Next.js 服务器启动问题** ✅
- **问题**: 使用 `.bin/next` 在 Windows 上会失败
- **解决方案**:
  - 优先使用 Next.js standalone 模式的 `server.js`
  - 回退到使用 `node` + `next CLI` 路径
  - 避免使用 shell 脚本，直接使用 Node.js 可执行文件

### 3. **日志不足** ✅
- **问题**: 启动失败时无法获取详细错误信息
- **解决方案**:
  - 添加详细的日志记录系统
  - 日志文件保存在用户主目录: `~/ImagineThis/logs/`
  - 记录所有关键路径和启动步骤
  - 错误时自动打开日志文件所在目录

### 4. **打包配置问题** ✅
- **问题**: standalone 模式文件未正确打包
- **解决方案**:
  - 更新 `electron-builder` 配置以支持 standalone 模式
  - 使用 `extraFiles` 确保静态资源正确复制
  - 添加 post-build 脚本自动整理文件结构
  - 扩展 `asarUnpack` 包含原生模块

### 5. **构建验证** ✅
- **问题**: 构建后无法验证产物是否完整
- **解决方案**:
  - 创建 `check-build.js` 脚本验证所有必需文件
  - 在打包前自动运行验证
  - 提供详细的构建统计信息

## 主要改进

### 改进的日志系统
```javascript
// 日志保存位置
~/ImagineThis/logs/app-YYYY-MM-DD.log

// 日志内容包括:
- 应用启动信息
- 平台和架构信息
- 所有关键路径
- Next.js 服务器输出
- 错误堆栈信息
```

### 更可靠的服务器启动
```javascript
// 启动流程:
1. 检测打包状态
2. 确定应用根目录
3. 验证关键文件存在
4. 选择正确的启动方式
5. 设置环境变量
6. 启动 Next.js 服务器
7. 监控输出并等待就绪
```

### Standalone 模式支持
```javascript
// 构建产物结构:
.next/standalone/
  ├── server.js          # 服务器入口
  ├── .next/
  │   └── static/       # 静态资源
  ├── public/           # 公共文件
  └── prisma/           # 数据库 Schema
```

## 使用方法

### 快速构建
```bash
npm run build:windows
```

### 手动构建步骤
```bash
# 1. 确保依赖已安装
npm install

# 2. 创建生产环境配置（如果不存在）
cp .env.production.example .env.production

# 3. 编辑 .env.production 填写配置
# 至少需要设置 NEXTAUTH_SECRET

# 4. 运行构建
npm run build:windows
```

### 验证构建产物
```bash
node scripts/check-build.js
```

## 构建输出

### 输出位置
```
dist-electron/
├── ImagineThis-0.1.0-x64.exe  (NSIS 安装包)
└── ImagineThis-0.1.0-x64.exe  (Portable 便携版)
```

### 日志位置
```
Windows: C:\Users\<用户名>\ImagineThis\logs\
Mac/Linux: ~/ImagineThis/logs/
```

## 测试建议

### 1. 本地测试
```bash
# 构建应用
npm run build:windows

# 安装或运行 Portable 版本
# 检查日志文件
```

### 2. 日志检查
启动应用后，立即检查日志文件：
- 确认所有路径正确
- 确认 Next.js 服务器启动成功
- 查看是否有错误信息

### 3. 功能测试
- [ ] 应用能正常启动
- [ ] 界面加载正常
- [ ] 数据库操作正常
- [ ] 图像处理功能正常
- [ ] 应用能正常退出

## 常见问题

### Q: 应用启动后白屏
**A**: 检查日志文件，通常是 Next.js 服务器启动失败。常见原因：
- 端口被占用（默认 23000）
- 缺少必要文件
- 数据库配置错误

### Q: 错误提示"无法启动应用服务"
**A**: 
1. 查看弹出的错误对话框中的日志文件路径
2. 打开日志文件查看详细错误
3. 检查是否缺少 `.env.production` 文件

### Q: 构建成功但打包失败
**A**: 运行验证脚本检查：
```bash
node scripts/check-build.js
```

### Q: 日志文件在哪里？
**A**: 
- Windows: `C:\Users\<用户名>\ImagineThis\logs\`
- Mac: `~/ImagineThis/logs/`
- Linux: `~/ImagineThis/logs/`

应用启动失败时会自动打开此目录。

## 技术细节

### Next.js Standalone 模式
使用 standalone 输出模式可以：
- 减小打包体积
- 简化部署
- 避免依赖问题
- 提高启动速度

### Electron Builder 配置
关键配置项：
```json
{
  "files": [".next/standalone/**/*", ...],
  "extraFiles": [{ "from": ".next/static", "to": ".next/static" }],
  "asarUnpack": [".next/**/*", ...]
}
```

### 日志系统
- 同时输出到控制台和文件
- 按日期分割日志文件
- 包含时间戳和级别信息
- 错误时自动打开日志目录

## 后续优化建议

1. **添加自动更新功能** - 使用 electron-updater
2. **添加性能监控** - 记录启动时间和资源使用
3. **改进错误处理** - 添加更友好的错误提示
4. **添加配置界面** - 允许用户修改端口等配置
5. **优化启动速度** - 延迟加载非关键模块

## 版本信息

- **修复日期**: 2025-11-25
- **修复版本**: 0.1.0
- **支持平台**: Windows 10/11 (x64)
- **Next.js**: 15.3.4
- **Electron**: 39.2.3

## 相关文档

- [BUILD_WINDOWS.md](./BUILD_WINDOWS.md) - 详细构建指南
- [electron/main.js](./electron/main.js) - 主进程代码
- [scripts/build-windows.mjs](./scripts/build-windows.mjs) - 构建脚本
- [scripts/check-build.js](./scripts/check-build.js) - 验证脚本
- [scripts/post-build.js](./scripts/post-build.js) - 后处理脚本
