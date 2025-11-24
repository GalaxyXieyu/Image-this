# macOS 应用打包指南

## 📋 目录
- [快速开始](#快速开始)
- [详细步骤](#详细步骤)
- [常见问题](#常见问题)
- [高级配置](#高级配置)

## 🚀 快速开始

### 一键打包（推荐）
```bash
npm run build:mac
```

这个命令会自动完成：
1. ✅ 环境检查
2. 🎨 生成 macOS 图标（.icns）
3. 🏗️ 构建 Next.js 应用
4. 📦 打包 Electron 应用

### 打包产物
打包完成后，在 `dist-electron/` 目录下会生成：
- `ImagineThis-0.1.0-x64.dmg` - Intel Mac 安装包
- `ImagineThis-0.1.0-arm64.dmg` - Apple Silicon 安装包
- `ImagineThis-0.1.0-x64.zip` - Intel Mac 压缩包
- `ImagineThis-0.1.0-arm64.zip` - Apple Silicon 压缩包

## 📝 详细步骤

### 1. 环境准备

#### 系统要求
- macOS 10.13 或更高版本
- Node.js 20.x LTS
- npm 或 pnpm

#### 安装依赖
```bash
npm install
# 或
pnpm install
```

### 2. 生成图标（可选）

如果需要单独生成 macOS 图标：
```bash
npm run build:icon:mac
```

这会从 `public/icon.png` 生成 `public/icon.icns`。

**图标要求：**
- 源文件：`public/icon.png`
- 推荐尺寸：1024x1024 像素
- 格式：PNG，支持透明背景

### 3. 构建应用

#### 方式一：使用自动化脚本（推荐）
```bash
npm run build:mac
```

#### 方式二：手动分步执行
```bash
# 1. 生成图标
npm run build:icon:mac

# 2. 构建 Next.js
npm run build

# 3. 打包 Electron
npm run electron:build:mac
```

### 4. 测试安装包

1. 找到生成的 `.dmg` 文件
2. 双击打开
3. 将应用拖到 Applications 文件夹
4. 从启动台或 Applications 文件夹运行

## ❓ 常见问题

### Q1: 打包时提示 "iconutil: command not found"
**原因：** 不在 macOS 系统上运行

**解决方案：**
- 在 macOS 上执行打包
- 或者手动准备 `icon.icns` 文件后再打包

### Q2: 应用无法打开，提示"已损坏"
**原因：** macOS Gatekeeper 安全机制

**解决方案：**
```bash
# 移除隔离属性
xattr -cr /Applications/ImagineThis.app

# 或者在系统设置中允许运行
# 系统设置 -> 隐私与安全性 -> 安全性 -> 仍要打开
```

### Q3: 打包后应用体积很大
**原因：** 包含了完整的 Node.js 和依赖

**优化方案：**
1. 清理 `node_modules` 中的开发依赖
2. 使用 `asar` 压缩（已默认启用）
3. 配置 `files` 字段，只打包必要文件

### Q4: 如何支持 Apple Silicon（M1/M2/M3）？
**答：** 已默认支持！

打包配置中已包含：
```json
"arch": ["x64", "arm64"]
```

会同时生成 Intel 和 Apple Silicon 版本。

### Q5: 如何进行代码签名？
**答：** 需要 Apple Developer 账号

1. 获取开发者证书
2. 配置环境变量：
```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-password
```

3. 打包时会自动签名

## 🔧 高级配置

### 自定义打包配置

编辑 `package.json` 中的 `build.mac` 部分：

```json
{
  "build": {
    "mac": {
      "category": "public.app-category.graphics-design",
      "icon": "public/icon.icns",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "executableName": "ImagineThis",
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    }
  }
}
```

### 可用的 target 类型

| Target | 说明 | 推荐 |
|--------|------|------|
| `dmg` | 磁盘映像安装包 | ✅ 推荐 |
| `zip` | 压缩包 | ✅ 推荐 |
| `pkg` | macOS 安装包 | 需要签名 |
| `mas` | Mac App Store | 需要特殊配置 |

### 修改应用信息

编辑 `package.json`：
```json
{
  "name": "imagine-this-nextjs",
  "version": "0.1.0",
  "description": "专业的 AI 图像处理平台",
  "author": "Imagine This Team",
  "build": {
    "appId": "com.imaginethis.app",
    "productName": "ImagineThis"
  }
}
```

### 配置文件包含规则

```json
{
  "build": {
    "files": [
      "electron/**/*",
      ".next/**/*",
      "public/**/*",
      "prisma/**/*",
      "node_modules/**/*",
      "package.json",
      ".env"
    ],
    "asarUnpack": [
      "node_modules/@img/**/*",
      "node_modules/canvas/**/*",
      "node_modules/sharp/**/*"
    ]
  }
}
```

## 📊 打包流程图

```
开始
  ↓
环境检查
  ↓
生成 macOS 图标 (.icns)
  ↓
构建 Next.js 应用
  ↓
打包 Electron 应用
  ├─ Intel (x64)
  │   ├─ .dmg
  │   └─ .zip
  └─ Apple Silicon (arm64)
      ├─ .dmg
      └─ .zip
  ↓
完成
```

## 🎯 最佳实践

### 1. 版本管理
每次发布前更新版本号：
```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

### 2. 测试流程
1. 在开发环境测试：`npm run electron:dev`
2. 构建测试版本：`npm run build:mac`
3. 安装并测试 DMG
4. 在不同 macOS 版本上测试

### 3. 发布检查清单
- [ ] 更新版本号
- [ ] 更新 CHANGELOG
- [ ] 测试所有核心功能
- [ ] 检查应用图标
- [ ] 测试 Intel 和 Apple Silicon 版本
- [ ] 准备发布说明

## 📚 相关资源

- [Electron Builder 文档](https://www.electron.build/)
- [macOS 代码签名指南](https://www.electron.build/code-signing)
- [Apple Developer](https://developer.apple.com/)

## 🆘 获取帮助

遇到问题？
1. 查看 [常见问题](#常见问题)
2. 检查构建日志
3. 提交 Issue

---

**最后更新：** 2025-11-23
**版本：** 1.0.0
