# 数据库损坏修复指南

## 🚨 问题症状

如果你看到以下错误信息，说明数据库已损坏：
```
database disk image is malformed
ConnectorError: QueryError(SqliteError { extended_code: 11 })
```

## 📍 数据库位置

### Windows
```
C:\Users\<你的用户名>\AppData\Roaming\ImagineThis\data\
```

快速访问：按 `Win + R`，输入 `%APPDATA%\ImagineThis\data`

### macOS
```
~/Library/Application Support/ImagineThis/data/
```

### Linux
```
~/.config/ImagineThis/data/
```

## ✅ 解决方案

### 方案 1：自动修复（推荐）⭐

**从 v0.2.0 版本开始，应用已内置自动修复功能**

1. 关闭应用
2. 重新启动应用
3. 应用会自动检测并修复损坏的数据库
4. 损坏的数据库会自动备份到 `corrupted-backups` 文件夹

**查看修复日志：**
- Windows: `C:\Users\<用户名>\ImagineThis\logs\`
- macOS: `~/ImagineThis/logs/`
- Linux: `~/ImagineThis/logs/`

### 方案 2：手动删除（适用于旧版本）

**步骤：**

1. **完全关闭应用**

2. **打开数据库目录**
   - Windows: 按 `Win + R`，输入 `%APPDATA%\ImagineThis\data`，回车
   - macOS: 在 Finder 中按 `Cmd + Shift + G`，输入 `~/Library/Application Support/ImagineThis/data`
   - Linux: 打开终端，执行 `cd ~/.config/ImagineThis/data`

3. **删除以下文件**：
   - `app.db`
   - `app.db-shm`（如果存在）
   - `app.db-wal`（如果存在）

4. **重新启动应用** - 应用会自动创建新的数据库

## 🔍 常见原因

数据库损坏通常由以下原因导致：

1. **异常关闭** - 应用在写入数据时被强制终止
2. **磁盘空间不足** - 写入时磁盘已满
3. **磁盘错误** - 硬盘或 SSD 出现物理错误
4. **并发访问** - 多个进程同时访问数据库（不应该发生）

## 💡 预防措施

1. **正常关闭应用** - 不要强制结束进程
2. **保持足够磁盘空间** - 至少保留 1GB 可用空间
3. **定期备份** - 应用会自动备份，但建议定期手动备份重要数据
4. **检查磁盘健康** - 定期运行磁盘检查工具

## 📦 数据备份

### 自动备份
应用会在检测到数据库损坏时自动备份到：
```
<数据目录>/corrupted-backups/app-corrupted-<时间戳>.db
```

### 手动备份
定期复制整个数据目录到安全位置：
```
Windows: C:\Users\<用户名>\AppData\Roaming\ImagineThis\
macOS: ~/Library/Application Support/ImagineThis/
Linux: ~/.config/ImagineThis/
```

## 🆘 仍然无法解决？

如果以上方法都无法解决问题：

1. **查看日志文件**：
   - Windows: `C:\Users\<用户名>\ImagineThis\logs\error-<日期>.log`
   - macOS: `~/ImagineThis/logs/error-<日期>.log`

2. **完全卸载并重新安装**：
   - 卸载应用
   - 手动删除数据目录（见上文）
   - 重新安装应用

3. **联系技术支持**：
   - 提供错误日志文件
   - 描述问题发生的具体情况

## 🔧 开发者信息

### 数据库检查脚本（开发环境）

```bash
# 检查数据库完整性
sqlite3 path/to/app.db "PRAGMA integrity_check;"

# 尝试修复数据库
sqlite3 path/to/app.db ".recover" | sqlite3 recovered.db
```

### 数据库结构
应用使用 SQLite 数据库，通过 Prisma ORM 管理。数据库 Schema 定义在 `prisma/schema.prisma`。

---

**版本**: v0.2.0  
**更新日期**: 2025-12-06
