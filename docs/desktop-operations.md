# ImagineThis 桌面端运维手册

> 更新日期：2026-06-06  
> 范围：桌面端发布、Windows 签名、SQLite 数据库修复。

## 1. 发布链路

当前 Windows 桌面端更新通过 GitHub Releases 分发。桌面应用使用 `electron-updater` 的 generic feed，指向最新 release 资产。

### 发布时会发生什么

1. 推送版本 tag，例如 `v0.2.3`。
2. GitHub Actions 构建 Windows 安装包和 portable 包。
3. Workflow 上传产物到 GitHub Release。
4. 已安装客户端检查 `DESKTOP_UPDATE_FEED_URL/latest.yml` 并下载更新。
5. `bojie.store` 上传链路保留兼容，但 GitHub Release assets 是优先更新源。

### GitHub 配置

Repository secrets：

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PORT`
- `SERVER_SSH_KEY`

Repository variables：

- `DESKTOP_UPDATE_BASE_URL`
- `WINDOWS_UPDATE_REMOTE_DIR`

当前推荐值：

- `DESKTOP_UPDATE_FEED_URL=https://github.com/GalaxyXieyu/Image-this/releases/latest/download`
- `WINDOWS_UPDATE_REMOTE_DIR=/data/imagine-this-updates/windows`

### 发布步骤

1. 更新 `package.json` version。
2. 提交版本变更。
3. 创建并推送匹配 tag。

```bash
git tag v0.2.3
git push origin main --tags
```

4. 等待 `Build And Publish Windows App` workflow 完成。
5. 打开已安装应用，在设置页触发更新检查做快速验证。

## 2. Windows 代码签名

### 为什么需要签名

在开启 Smart App Control 或更严格 Code Integrity 策略的 Windows 机器上，未签名桌面应用可能在启动前被拦截。本地自签证书只适合链路测试，不足以解决真实用户机器上的可信发布者和信誉拦截问题。

### 当前构建顺序

1. Electron `afterPack` 阶段重写主 EXE 图标。
2. 如果存在签名变量，签名 packaged app 内的 Windows 二进制文件。
3. 安装包和 portable 产物生成后，再签名最终 `.exe` 产物。

这个顺序不能随意调整：签名后再修改 EXE 资源会导致签名失效。

### 签名环境变量

运行 `npm run build:windows` 前设置：

```powershell
$env:WINDOWS_SIGN_CERT_PATH="C:\path\to\certificate.pfx"
$env:WINDOWS_SIGN_CERT_PASSWORD="your-password"
$env:WINDOWS_SIGN_TIMESTAMP_URL="http://timestamp.digicert.com"
$env:WINDOWS_SIGN_URL="https://bojie.store"
$env:WINDOWS_SIGN_DESCRIPTION="ImagineThis"
```

可选选择器：

```powershell
$env:WINDOWS_SIGN_CERT_SHA1="THUMBPRINT"
$env:WINDOWS_SIGN_CERT_SUBJECT="Your Company Name"
$env:WINDOWS_SIGN_TOOL_PATH="C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe"
```

公开分发建议使用可信 CA 的 OV 或 EV 代码签名证书。未配置签名变量时，构建仍会成功，但 Windows 可能在高安全策略机器上阻止启动。

## 3. 数据库损坏修复

### 典型症状

```text
database disk image is malformed
ConnectorError: QueryError(SqliteError { extended_code: 11 })
```

### 数据目录

| 系统 | 数据目录 |
|---|---|
| Windows | `C:\Users\<用户名>\AppData\Roaming\ImagineThis\data\` |
| macOS | `~/Library/Application Support/ImagineThis/data/` |
| Linux | `~/.config/ImagineThis/data/` |

Windows 快速访问：按 `Win + R`，输入 `%APPDATA%\ImagineThis\data`。

### 自动修复

从 v0.2.0 开始，应用内置自动修复：

1. 关闭应用。
2. 重新启动应用。
3. 应用检测并修复损坏数据库。
4. 损坏数据库备份到 `corrupted-backups`。

日志位置：

| 系统 | 日志目录 |
|---|---|
| Windows | `C:\Users\<用户名>\ImagineThis\logs\` |
| macOS | `~/ImagineThis/logs/` |
| Linux | `~/ImagineThis/logs/` |

### 手动重置

适用于旧版本或自动修复失败：

1. 完全关闭应用。
2. 打开数据目录。
3. 删除以下文件：
   - `app.db`
   - `app.db-shm`，如果存在
   - `app.db-wal`，如果存在
4. 重新启动应用，应用会创建新数据库。

### 常见原因

- 应用写入时被强制终止。
- 磁盘空间不足。
- 磁盘错误。
- 多进程异常并发访问同一个 SQLite 文件。

### 开发环境检查

```bash
sqlite3 path/to/app.db "PRAGMA integrity_check;"
sqlite3 path/to/app.db ".recover" | sqlite3 recovered.db
```

数据库 schema 位于 `prisma/schema.prisma`。