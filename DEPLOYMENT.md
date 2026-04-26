# 🚀 Image-this 自动部署文档（Standalone / PM2）

## 概述

该项目已改为 **Standalone 制品自动部署**。
当代码推送到 `main` 分支时，GitHub Actions 会：

1. 在 GitHub Runner 上安装依赖并构建 Next.js standalone 制品
2. 打包部署 bundle
3. 通过 SSH / SCP 上传到服务器
4. 在服务器上解压到 release 目录
5. 复用共享数据目录（SQLite / uploads / .env）
6. 执行 `Prisma db push`
7. 用 PM2 重载服务
8. 做健康检查并清理旧版本

### 部署流程

```text
本地开发 → Git Push → GitHub Actions 构建 standalone → 上传服务器 → PM2 重载 → 健康检查
```

---

## 🔑 GitHub Secrets

访问：
`https://github.com/GalaxyXieyu/Image-this/settings/secrets/actions`

需要以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SERVER_HOST` | 服务器 IP / 域名 | 博杰服务器地址 |
| `SERVER_USER` | `root` 或部署用户 | SSH 登录用户名 |
| `SERVER_SSH_KEY` | SSH 私钥内容 | GitHub Actions 用于登录服务器 |
| `SERVER_PORT` | `22` | SSH 端口 |

---

## 🗂️ 服务器目录结构

部署根目录：

```bash
/root/data/Image-this
```

关键目录：

```text
/root/data/Image-this/
├── current -> /root/data/Image-this/releases/<commit>
├── releases/
│   ├── <commit-a>/
│   ├── <commit-b>/
│   └── ...
├── shared/
│   ├── .env
│   ├── data/
│   │   └── app.db
│   └── public/
│       └── uploads/
├── backups/
└── scripts/
    └── deploy-standalone.sh
```

说明：
- `releases/`：每次部署一个独立版本目录
- `current`：当前线上版本软链接
- `shared/data/app.db`：SQLite 数据库持久化
- `shared/public/uploads/`：上传文件持久化
- `shared/.env`：生产环境变量

---

## 🧩 运行方式

线上服务由 PM2 托管：

- PM2 应用名：`imagine-this-web`
- 启动脚本：`server.js`（由 `.next/standalone` 制品展开到 release 根目录）
- 监听端口：`34123`
- 健康检查：`http://image.bojie.store/api/health`

项目使用：
- `ecosystem.production.config.js`
- `scripts/deploy-standalone.sh`

---

## 📦 首次部署前准备

### 1. 安装 Node.js 20

项目要求 Node 20。

建议服务器安装并默认切换到 Node 20。

### 2. 安装 PM2

```bash
npm install -g pm2
pm2 -v
```

### 3. 准备环境变量文件

在服务器创建：

```bash
mkdir -p /root/data/Image-this/shared
nano /root/data/Image-this/shared/.env
```

至少应包含：

```env
DATABASE_URL="file:./data/app.db"
NEXTAUTH_URL="http://image.bojie.store"
NEXTAUTH_SECRET="请替换成长度足够的随机字符串"
```

如果项目还依赖其他 AI / MinIO / 第三方配置，也一并写入这个 `.env`。

### 4. 创建共享目录

```bash
mkdir -p /root/data/Image-this/shared/data
mkdir -p /root/data/Image-this/shared/public/uploads
mkdir -p /root/data/Image-this/releases
mkdir -p /root/data/Image-this/backups
mkdir -p /root/data/Image-this/scripts
```

---

## 🔄 自动部署说明

当前 workflow 文件：

- `.github/workflows/deploy-docker.yml`

虽然文件名还叫 `deploy-docker.yml`，但内容已经改成 **standalone + PM2 部署链路**。

### CI 做的事

- `npm ci`
- `npm run build`
- 打包 `.next/standalone` 与 Prisma runtime
- 上传压缩包与部署脚本
- 服务器执行部署脚本

### 服务器做的事

- 备份 `app.db` / `uploads`
- 解压新版本到 `releases/<commit>`
- 软链共享数据目录和 `.env`
- 执行 `Prisma db push`
- PM2 reload
- 健康检查
- 清理旧 release（保留最近 5 个）
- 部署失败时回滚到上一个 release

---

## 🛠️ 常用运维命令

### 查看 PM2 状态

```bash
pm2 list
pm2 status imagine-this-web
```

### 查看日志

```bash
pm2 logs imagine-this-web
pm2 logs imagine-this-web --lines 100
```

### 查看当前线上目录

```bash
readlink -f /root/data/Image-this/current
```

### 查看 release 列表

```bash
ls -lah /root/data/Image-this/releases
```

### 手动执行部署脚本

```bash
cd /root/data/Image-this
bash scripts/deploy-standalone.sh <commit> /root/data/Image-this/image-this-<commit>.tar.gz
```

### 手动回滚

```bash
cd /root/data/Image-this
ls -lah releases
ln -sfn /root/data/Image-this/releases/<旧commit> current
cd current
pm2 startOrReload ecosystem.production.config.js --update-env
pm2 save
```

---

## 🩺 健康检查

```bash
curl http://127.0.0.1:34123/api/health
curl http://image.bojie.store/api/health
```

---

## ❓ 常见问题

### Q: 为什么不用 Docker 了？

A: 因为博杰服务器在国内，拉取 GHCR Docker 镜像稳定性差。改成 GitHub Actions 构建制品后上传服务器，部署成功率更高。

### Q: 服务器还需要 `npm ci` 吗？

A: 正常情况下不需要。依赖和 standalone bundle 已在 CI 构建并打包上传。

### Q: 数据会不会丢？

A: 不会。数据库和上传文件放在 `shared/` 下，不跟随 release 删除；部署前还会自动备份。

### Q: 怎么看是否真的切到新版本？

A: 查看：

```bash
readlink -f /root/data/Image-this/current
```

如果路径已经切到新的 commit 目录，说明版本切换成功。

---

## 📝 注意事项

1. 生产环境推荐 Node 20
2. `shared/.env` 必须存在，至少包含 `NEXTAUTH_SECRET` 和 `NEXTAUTH_URL`
3. `shared/data/app.db` 与 `shared/public/uploads/` 是持久化目录，不要删除
4. 每次部署会保留最近 5 个 release，旧版本会自动清理
5. 若 PM2 未安装，部署脚本会尝试自动安装

---

## 🎉 完成

现在该项目已从 Docker 部署切换为更适合国内服务器的：

**GitHub Actions 构建 standalone 制品 → 上传服务器 → PM2 运行**

这能显著降低因拉 Docker 镜像导致的部署失败概率。
