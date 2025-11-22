# 应用打包指南

## 📦 打包状态

### ✅ 已完成
- [x] 创建应用图标（SVG + PNG 多尺寸）
- [x] 修复 Next.js 15 类型错误
- [x] 配置国内镜像加速下载
- [x] 修复应用名称空格问题
- [x] Next.js 应用构建成功

### 🔄 进行中
- [ ] macOS 应用打包（正在运行中...）
- [ ] Windows 应用打包（待执行）

## 🚀 打包命令

### macOS 应用
```bash
npm run electron:build:mac
```

**输出文件位置:**
- `dist-electron/ImagineThis-*.dmg` - DMG 安装包
- `dist-electron/ImagineThis-*.zip` - ZIP 压缩包
- `dist-electron/mac-arm64/ImagineThis.app` - 应用程序

### Windows 应用
```bash
npm run electron:build:win
```

**输出文件位置:**
- `dist-electron/ImagineThis Setup *.exe` - NSIS 安装程序
- `dist-electron/ImagineThis *.exe` - 便携版

**注意:** Windows 打包需要在 macOS 上安装额外依赖：
```bash
brew install wine mono
```

或者在 Windows 系统上执行打包命令。

## 📋 配置说明

### package.json 配置
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
    "mac": {
      "category": "public.app-category.graphics-design",
      "icon": "public/icon.png",
      "target": ["dmg", "zip"]
    },
    "win": {
      "icon": "public/icon.png",
      "target": ["nsis", "portable"]
    }
  }
}
```

### 镜像配置 (.npmrc)
```
electron_mirror=https://npmmirror.com/mirrors/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
```

## 🔧 常见问题

### 1. 下载 Electron 失败
**解决方案:** 已配置国内镜像，使用 npmmirror.com

### 2. 应用名称包含空格导致打包失败
**解决方案:** 已将 "Imagine This" 改为 "ImagineThis"

### 3. Next.js 15 类型错误
**解决方案:** 已修复 API 路由中的 params 类型，使用 `Promise<{ id: string }>` 包装

### 4. Windows 打包在 macOS 上失败
**解决方案:** 
- 安装 wine 和 mono: `brew install wine mono`
- 或在 Windows 系统上打包

## 📊 打包进度监控

### 检查当前打包状态
```bash
# 查看 dist-electron 目录
ls -lh dist-electron/

# 查看打包日志
tail -f dist-electron/builder-debug.yml
```

### macOS 打包预计时间
- 下载 Electron: ~2-5 分钟（113 MB）
- 复制文件: ~5-10 分钟（node_modules 很大）
- 创建 DMG: ~2-3 分钟
- **总计: 约 10-20 分钟**

### Windows 打包预计时间
- 下载 Electron: ~2-5 分钟
- 复制文件: ~5-10 分钟
- 创建安装程序: ~3-5 分钟
- **总计: 约 10-20 分钟**

## ✨ 打包完成后

### 测试应用
```bash
# macOS
open dist-electron/mac-arm64/ImagineThis.app

# Windows (在 Windows 系统上)
dist-electron\ImagineThis.exe
```

### 分发应用
- **macOS:** 分发 `.dmg` 文件
- **Windows:** 分发 `Setup.exe` 安装程序或 `.exe` 便携版

## 📝 下一步操作

1. **等待 macOS 打包完成**
   - 当前命令正在运行中
   - 预计还需要 5-15 分钟

2. **打包 Windows 应用**
   ```bash
   npm run electron:build:win
   ```

3. **测试应用**
   - 安装并运行应用
   - 测试所有功能是否正常

4. **代码签名（可选）**
   - macOS: 需要 Apple Developer 账号
   - Windows: 需要代码签名证书

## 🎯 快速命令参考

```bash
# 生成图标
node scripts/generate-icon.js

# 构建 Next.js
npm run build

# 打包 macOS
npm run electron:build:mac

# 打包 Windows
npm run electron:build:win

# 打包所有平台
npm run electron:build

# 开发模式测试
npm run electron:dev
```

## 📞 技术支持

如有问题，请检查：
1. `dist-electron/builder-effective-config.yaml` - 实际使用的配置
2. `dist-electron/builder-debug.yml` - 调试信息
3. 终端输出的错误信息
