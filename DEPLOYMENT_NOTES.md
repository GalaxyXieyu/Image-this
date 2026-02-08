# 部署注意事项

## 数据库文件名

本项目的数据库文件名为 `database.sqlite`，但 Docker 配置使用 `app.db`。

已在服务器 `/root/data/Image-this/data/` 目录创建符号链接：
```bash
ln -sf database.sqlite app.db
```

这确保 Docker 容器可以正确访问数据库文件。

## 首次部署后的手动步骤

1. 确保服务器上存在 `data/` 目录
2. 如果数据库文件不是 `app.db`，创建符号链接：
   ```bash
   cd /root/data/Image-this/data
   ln -sf <实际数据库文件名> app.db
   ```
