# 开发环境设置指南

## 快速启动

### 方式一：一键启动（推荐）

运行自动化设置脚本：

```bash
./scripts/dev-setup.sh
```

这个脚本会自动：
- 启动 Docker 服务（PostgreSQL）
- 创建 .env 配置文件
- 安装项目依赖
- 生成 Prisma Client
- 运行数据库迁移
- 创建本地上传目录

完成后运行：
```bash
npm run dev
```

### 方式二：手动启动

#### 1. 启动基础服务

使用 Docker Compose 启动 PostgreSQL：

```bash
docker-compose -f docker-compose.dev.yml up -d
```

这将启动以下服务：
- PostgreSQL 数据库 (端口 5432)

#### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

默认配置已设置为使用本地 PostgreSQL，文件上传使用本地文件系统（保存在 `public/uploads`），一般无需修改。

#### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init
```

#### 4. 启动开发服务器

```bash
npm run dev
# 或
pnpm dev
```

应用将运行在 `http://localhost:3000`

## 服务访问

### PostgreSQL
- Host: localhost
- Port: 5432
- Database: ai_images_generated
- User: postgres
- Password: postgres

## 常用命令

### Docker 服务管理

```bash
# 启动服务
docker-compose -f docker-compose.dev.yml up -d

# 停止服务
docker-compose -f docker-compose.dev.yml down

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 重启服务
docker-compose -f docker-compose.dev.yml restart

# 清理所有数据（包括卷）
docker-compose -f docker-compose.dev.yml down -v
```

### Prisma 命令

```bash
# 生成 Prisma Client
npx prisma generate

# 创建新的迁移
npx prisma migrate dev --name migration_name

# 重置数据库
npx prisma migrate reset

# 打开 Prisma Studio (数据库可视化工具)
npx prisma studio
```

## 数据库切换

### 从 SQLite 切换到 PostgreSQL

1. 修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. 修改 `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_images_generated"
```

3. 重新生成并迁移:
```bash
npx prisma generate
npx prisma migrate dev
```

### 从 PostgreSQL 切换到 SQLite

1. 修改 `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

2. 修改 `.env`:
```env
DATABASE_URL="file:./dev.db"
```

3. 重新生成并迁移:
```bash
npx prisma generate
npx prisma migrate dev
```

## 故障排查

### PostgreSQL 连接失败
- 检查 Docker 容器是否正在运行: `docker ps`
- 检查端口是否被占用: `lsof -i :5432`
- 查看 PostgreSQL 日志: `docker logs ai-images-postgres`

### Prisma 迁移失败
- 确保数据库服务正在运行
- 检查 DATABASE_URL 配置是否正确
- 尝试重置数据库: `npx prisma migrate reset`
