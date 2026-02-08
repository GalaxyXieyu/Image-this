# 🚀 Image-this 自动部署文档

## 概述

该项目已配置 **Docker 自动部署**，当代码推送到 `main` 分支时会自动触发部署流程。

### 部署流程

```
本地开发 → Git Push → GitHub Actions → 构建Docker镜像 → SSH部署到服务器 → 自动重启
```

## 🔑 配置 GitHub Secrets

### 1. 获取 SSH 私钥

SSH 密钥对已生成，私钥位于服务器：

```bash
# 在服务器上执行
cat ~/.ssh/github-actions-deploy
```

复制全部内容（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）

### 2. 在 GitHub 仓库中添加 Secrets

访问：`https://github.com/GalaxyXieyu/Image-this/settings/secrets/actions`

添加以下 4 个 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SERVER_HOST` | `38.76.197.25` | 服务器 IP 地址 |
| `SERVER_USER` | `root` | SSH 登录用户名 |
| `SERVER_SSH_KEY` | `<SSH 私钥内容>` | SSH 私钥完整内容 |
| `SERVER_PORT` | `22` | SSH 端口号（默认 22） |

### 3. 验证配置

配置完成后，推送任何代码到 `main` 分支即可触发部署：

```bash
git push origin main
```

然后访问：`https://github.com/GalaxyXieyu/Image-this/actions`

查看部署进度。

## 🛠️ 已创建的文件

以下文件已自动创建：

- ✅ `.github/workflows/deploy-docker.yml` - GitHub Actions 工作流
- ✅ `docker-compose.production.yml` - Docker Compose 配置
- ✅ `scripts/deploy-docker.sh` - Docker 部署脚本
- ✅ `.dockerignore` - Docker 构建优化
- ✅ `~/.ssh/github-actions-deploy` - SSH 密钥对

## 🐳 Docker 部署特性

### 数据持久化

- **数据库**: `./data` 目录映射到容器内 `/app/data`
- **上传文件**: `./public/uploads` 映射到容器内 `/app/public/uploads`
- **备份**: 每次部署前自动备份，保留最近 10 个备份

### 健康检查

- 端点：`http://38.76.197.25:34123/api/health`
- 间隔：30秒
- 超时：10秒
- 重试：3次

### 自动回滚

如果健康检查失败，部署脚本会自动：
1. 停止新容器
2. 恢复数据库备份
3. 恢复上传文件备份
4. 显示错误日志

## 🔄 Git 工作流

### 分支策略

```
main (生产分支，推送后自动部署)
  ↑
  ├─ feature/xxx (功能开发)
  ├─ bugfix/xxx (问题修复)
  └─ hotfix/xxx (紧急修复)
```

### 开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: add new feature"

# 3. 推送并创建 PR
git push origin feature/new-feature

# 4. 在 GitHub 上创建 Pull Request

# 5. 合并到 main 触发部署
# GitHub 上合并 PR → 自动部署
```

## 🛡️ 故障排查

### 查看 Docker 日志

```bash
docker logs imagine-this-app
docker logs imagine-this-app --tail 100
docker logs -f imagine-this-app  # 实时查看
```

### 查看容器状态

```bash
docker ps
docker stats imagine-this-app --no-stream
```

### 手动执行部署

```bash
cd /root/data/Image-this
bash scripts/deploy-docker.sh
```

### 回滚到上一版本

```bash
cd /root/data/Image-this/backups
ls -lt  # 查看备份

# 恢复数据库
cp app.db.20260208_120000 ../data/app.db

# 恢复上传文件
tar -xzf uploads.20260208_120000.tar.gz -C ..

# 重启容器
docker-compose -f docker-compose.production.yml restart
```

## 📊 监控

### 健康检查

```bash
curl http://38.76.197.25:34123/api/health
```

### 页面访问

- 服务地址：http://38.76.197.25:34123
- 健康检查：http://38.76.197.25:34123/api/health

## 🚀 首次部署

### 准备服务器环境

```bash
# 1. 确保 Docker 和 Docker Compose 已安装
docker --version
docker-compose --version

# 2. 创建必要目录
cd /root/data/Image-this
mkdir -p data backups public/uploads

# 3. 停止现有 PM2 服务（如果使用 Docker）
pm2 stop imagine-this
pm2 delete imagine-this
pm2 save
```

### 提交配置文件

```bash
# 1. 创建功能分支
git checkout -b feat/add-docker-deployment

# 2. 添加文件
git add .github/ docker-compose.production.yml scripts/ .dockerignore DEPLOYMENT.md

# 3. 提交
git commit -m "feat(ci): add Docker-based auto-deployment with GitHub Actions"

# 4. 推送
git push origin feat/add-docker-deployment

# 5. 在 GitHub 创建 PR 并合并到 main
# 合并后将自动触发第一次部署
```

## ❓ 常见问题

### Q: 部署失败怎么办？

A: 
1. 查看 GitHub Actions 日志：`https://github.com/GalaxyXieyu/Image-this/actions`
2. 查看服务器 Docker 日志：`docker logs imagine-this-app`
3. 检查 GitHub Secrets 配置是否正确
4. 检查 SSH 连接是否正常

### Q: 如何跳过自动部署？

A: 在提交消息中添加 `[skip ci]`：
```bash
git commit -m "docs: update README [skip ci]"
```

### Q: 如何手动触发部署？

A: 访问 GitHub Actions，点击 "Run workflow" 按钮

### Q: 如何查看部署历史？

A: 访问 `https://github.com/GalaxyXieyu/Image-this/actions`

## 📝 注意事项

1. **环境变量**: 敏感信息（`NEXTAUTH_SECRET`）已在服务器 `.env` 文件中，无需配置到 GitHub Secrets
2. **端口映射**: Docker 容器内部端口 3000，映射到服务器端口 34123
3. **镜像仓库**: 使用 GitHub Container Registry (ghcr.io)，免费且无需额外配置
4. **数据备份**: 每次部署前自动备份，保留最近 10 个备份

## 🎉 完成！

现在你已经拥有了一个完整的自动化部署流程！

每次推送代码到 `main` 分支，服务会在 2-3 分钟内自动更新。
