# Windows 应用构建指南

本指南将帮助你将 Imagine This 项目构建成 Windows 桌面应用。

## 📋 前置要求

### 系统要求
- **操作系统**: Windows 10/11, macOS, 或 Linux
- **Node.js**: 20.x LTS 或更高版本
- **npm**: 9.x 或更高版本
- **磁盘空间**: 至少 2GB 可用空间

### 依赖检查
```bash
# 检查 Node.js 版本
node -v  # 应该显示 v20.x.x

# 检查 npm 版本
npm -v   # 应该显示 9.x.x 或更高
```

## 🚀 快速开始

### 方法一：使用自动化脚本（推荐）

```bash
# 1. 安装依赖（如果还没安装）
npm install

# 2. 运行自动化构建脚本
npm run build:windows
```

脚本会自动完成以下步骤：
- ✅ 检查构建环境
- ✅ 创建生产环境配置
- ✅ 安装依赖
- ✅ 生成数据库 Schema
- ✅ 构建 Next.js 应用
- ✅ 打包 Electron 应用

### 方法二：手动构建

```bash
# 1. 安装依赖
npm install

# 2. 配置生产环境
cp .env.production.example .env.production
# 编辑 .env.production 文件，填写实际配置

# 3. 生成 Prisma Client
npx prisma generate

# 4. 构建 Next.js 应用
npm run build

# 5. 打包 Windows 应用
npm run electron:build:win
```

## ⚙️ 配置说明

### 环境变量配置

编辑 `.env.production` 文件：

```bash
# 数据库配置（使用 SQLite）
DATABASE_URL="file:./prisma/prod.db"

# NextAuth.js 配置
NEXTAUTH_URL="http://localhost:23000"
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars"

# AI 服务配置（可选）
# OPENAI_API_KEY="sk-..."
# ANTHROPIC_API_KEY="sk-ant-..."
```

### 图标配置

项目已配置使用 `public/icon.png` 作为应用图标。

如需自定义图标：
1. 替换 `public/icon.png`（推荐尺寸：512x512 或更大）
2. 运行 `npm run build:icon` 生成多尺寸图标

## 📦 构建产物

构建完成后，在 `dist-electron/` 目录下会生成以下文件：

### NSIS 安装包
- **文件名**: `ImagineThis-0.1.0-x64.exe`
- **类型**: 安装程序
- **特点**: 
  - 完整的安装向导
  - 可选择安装路径
  - 创建桌面快捷方式
  - 创建开始菜单快捷方式
  - 支持卸载

### Portable 版本
- **文件名**: `ImagineThis-0.1.0-x64.exe`
- **类型**: 免安装版
- **特点**:
  - 无需安装，直接运行
  - 适合 U 盘携带
  - 数据存储在程序目录

## 🎯 构建选项

### 仅构建 NSIS 安装包
```bash
npm run build
npx electron-builder --win nsis
```

### 仅构建 Portable 版本
```bash
npm run build
npx electron-builder --win portable
```

### 构建 32 位版本
编辑 `package.json` 中的 `build.win.target`：
```json
"target": [
  {
    "target": "nsis",
    "arch": ["ia32"]  // 32 位
  }
]
```

### 同时构建 32 位和 64 位
```json
"target": [
  {
    "target": "nsis",
    "arch": ["x64", "ia32"]
  }
]
```

## 🔧 常见问题

### 1. 构建失败：缺少依赖

**问题**: `Error: Cannot find module 'xxx'`

**解决方案**:
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
```

### 2. 图标未显示

**问题**: Windows 应用图标显示为默认图标

**解决方案**:
```bash
# 确保图标文件存在
ls -la public/icon.png

# 重新生成图标
npm run build:icon

# 重新构建
npm run build:windows
```

### 3. 应用启动失败

**问题**: 双击应用后无法启动

**解决方案**:
1. 检查 `.env.production` 配置是否正确
2. 确保数据库文件路径正确
3. 查看日志文件（通常在用户目录下）

### 4. 构建速度慢

**问题**: 构建过程耗时很长

**优化方案**:
```bash
# 使用 npm 缓存
npm config set cache ~/.npm-cache

# 跳过不必要的文件
# 编辑 package.json 中的 build.files 配置
```

### 5. 在 Mac/Linux 上构建 Windows 应用

**问题**: 跨平台构建

**解决方案**:
```bash
# 安装 wine（仅 macOS/Linux 需要）
# macOS:
brew install wine

# Linux:
sudo apt-get install wine

# 然后正常构建
npm run build:windows
```

## 📊 构建配置详解

### electron-builder 配置

在 `package.json` 中的 `build` 字段：

```json
{
  "build": {
    "appId": "com.imaginethis.app",
    "productName": "ImagineThis",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "electron/**/*",
      ".next/**/*",
      "public/**/*",
      "prisma/**/*",
      "node_modules/**/*",
      "package.json",
      ".env"
    ],
    "win": {
      "icon": "public/icon.png",
      "target": ["nsis", "portable"],
      "artifactName": "${productName}-${version}-${arch}.${ext}",
      "publisherName": "Imagine This Team"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

### 配置说明

| 字段 | 说明 |
|------|------|
| `appId` | 应用唯一标识符 |
| `productName` | 应用显示名称 |
| `directories.output` | 构建输出目录 |
| `files` | 需要打包的文件 |
| `win.icon` | Windows 图标路径 |
| `win.target` | 构建目标格式 |
| `nsis.oneClick` | 是否单击安装 |
| `nsis.allowToChangeInstallationDirectory` | 允许自定义安装路径 |

## 🚢 发布应用

### 1. 版本号管理

更新 `package.json` 中的版本号：
```json
{
  "version": "1.0.0"
}
```

### 2. 生成发布包

```bash
npm run build:windows
```

### 3. 测试安装包

在 Windows 系统上测试：
1. 运行 NSIS 安装包
2. 完成安装向导
3. 启动应用并测试功能
4. 测试卸载功能

### 4. 分发应用

可以通过以下方式分发：
- 官网下载
- GitHub Releases
- 企业内网
- U 盘分发

## 📝 最佳实践

### 1. 构建前检查清单

- [ ] 更新版本号
- [ ] 测试所有功能
- [ ] 更新 CHANGELOG
- [ ] 配置生产环境变量
- [ ] 检查图标文件
- [ ] 清理开发依赖

### 2. 安全建议

- ✅ 不要在代码中硬编码 API 密钥
- ✅ 使用环境变量管理敏感信息
- ✅ 定期更新依赖包
- ✅ 启用代码签名（生产环境）

### 3. 性能优化

- 移除未使用的依赖
- 压缩图片资源
- 启用代码分割
- 使用生产模式构建

## 🔐 代码签名（可选）

为了避免 Windows SmartScreen 警告，建议对应用进行代码签名。

### 获取代码签名证书

1. 从证书颁发机构购买代码签名证书
2. 导出为 `.pfx` 或 `.p12` 格式

### 配置签名

在 `package.json` 中添加：
```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/cert.pfx",
      "certificatePassword": "your-password",
      "signingHashAlgorithms": ["sha256"]
    }
  }
}
```

## 📚 相关资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
- [Next.js 文档](https://nextjs.org/docs)
- [项目 README](./README.md)

## 💬 获取帮助

如遇到问题：
1. 查看本文档的常见问题部分
2. 查看项目 Issues
3. 联系开发团队

---

**最后更新**: 2025-11-23
**版本**: 1.0.0
