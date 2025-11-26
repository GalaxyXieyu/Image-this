# Windows AMD 处理器调试指南

## 🎯 针对 AMD Ryzen 7 5800U 的优化

### 已添加的 AMD 兼容性改进

1. **内存管理优化**
   ```javascript
   NODE_OPTIONS: '--max-old-space-size=4096'
   ```
   - 增加内存限制，避免内存不足导致的崩溃

2. **GPU 渲染优化**
   ```javascript
   webPreferences: {
     offscreen: false,
     backgroundThrottling: false,
   }
   ```
   - 针对 AMD Radeon Graphics 的兼容性设置

3. **硬件加速配置**
   ```javascript
   sandbox: false,
   skipTaskbar: false,
   windowsHide: true
   ```
   - 减少可能的硬件冲突

4. **路径修复 (v0.1.0)**
   - 修复了 Next.js standalone 模式的路径问题
   - 应用包大小从 335MB 优化到 239MB
   - 正确打包 `.next/standalone` 和 `.next/static` 目录

## 🔍 日志系统

### 日志文件位置
```
C:\Users\<你的用户名>\ImagineThis\logs\
├── app-2024-11-25.log        # 主日志文件
└── error-2024-11-25.log      # 错误日志文件
```

### 日志内容包含
- ✅ 系统信息（CPU、内存、架构）
- ✅ 应用启动步骤
- ✅ Next.js 服务器启动详情
- ✅ 文件路径检查结果
- ✅ 所有错误堆栈信息

## 🛠️ 调试步骤

### 1. 运行调试脚本
在 Windows 电脑上运行：
```cmd
node scripts/debug-windows.js
```

### 2. 查看日志文件
如果应用无法启动：
1. 按 `Win + R` 打开运行对话框
2. 输入：`%USERPROFILE%\ImagineThis\logs`
3. 回车打开日志目录
4. 查看最新的日志文件

### 3. 常见问题解决

#### 问题 1：端口被占用
```cmd
netstat -ano | findstr :23000
```
如果端口被占用，结束占用进程或修改端口。

#### 问题 2：内存不足
- 关闭其他应用程序
- 增加虚拟内存
- 使用便携版（占用更少内存）

#### 问题 3：权限问题
- 右键点击应用 → "以管理员身份运行"
- 检查防病毒软件是否阻止了应用

#### 问题 4：AMD GPU 驱动问题
- 更新 AMD Radeon 驱动到最新版本
- 在显卡设置中允许应用使用硬件加速

## 📋 测试清单

### 启动测试
- [ ] 双击 exe 文件能启动
- [ ] 没有立即崩溃
- [ ] 日志文件被创建
- [ ] Next.js 服务器启动成功

### 功能测试
- [ ] 界面正常显示
- [ ] 可以登录/注册
- [ ] 图像上传功能正常
- [ ] 图像处理功能正常

### 性能测试
- [ ] CPU 使用率正常 (< 50%)
- [ ] 内存使用合理 (< 2GB)
- [ ] 没有明显卡顿

## 🚨 如果仍然失败

### 收集以下信息
1. **完整的错误日志**
   ```
   C:\Users\<用户名>\ImagineThis\logs\error-2024-11-25.log
   ```

2. **系统信息**
   ```cmd
   systeminfo > system-info.txt
   dxdiag /t dx-info.txt
   ```

3. **事件查看器日志**
   - 打开"事件查看器"
   - 查看 "Windows 日志" → "应用程序"
   - 搜索 "ImagineThis" 相关的错误

### 手动启动调试
在命令行中直接运行：
```cmd
cd "C:\Program Files\ImagineThis"
ImagineThis.exe --enable-logging
```

## 📞 获取帮助

如果问题仍然存在，请提供：
1. 完整的错误日志文件
2. 系统信息截图
3. 错误发生时的操作步骤
4. Windows 版本和 AMD 驱动版本

## 🔄 备用方案

如果主应用无法运行：
1. **使用便携版**：解压后直接运行
2. **使用 Web 版本**：通过浏览器访问
3. **降级到开发模式**：使用 `npm run electron:dev`

---

**更新日期**: 2025-11-25  
**适用版本**: 0.1.0  
**支持平台**: Windows 10/11 + AMD 处理器
