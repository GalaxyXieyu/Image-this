#!/bin/bash

set -e

echo "=== AI Images Generated 开发环境初始化 ==="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 启动 Docker 服务
echo "1. 启动 PostgreSQL 和 MinIO 服务..."
docker-compose -f docker-compose.dev.yml up -d

# 等待服务就绪
echo "2. 等待服务启动..."
sleep 5

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "3. 创建 .env 文件..."
    cp .env.example .env
    echo "   已从 .env.example 创建 .env 文件"
else
    echo "3. .env 文件已存在，跳过"
fi

# 安装依赖
echo "4. 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "   安装依赖中..."
    npm install
else
    echo "   依赖已安装，跳过"
fi

# 生成 Prisma Client
echo "5. 生成 Prisma Client..."
npx prisma generate

# 运行数据库迁移
echo "6. 运行数据库迁移..."
npx prisma migrate dev --name init_postgres

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "服务信息:"
echo "  - 应用开发服务器: http://localhost:3000"
echo "  - PostgreSQL: localhost:5432"
echo "    数据库: ai_images_generated"
echo "    用户: postgres"
echo "    密码: postgres"
echo "  - 文件上传目录: public/uploads"
echo ""
echo "下一步:"
echo "  运行 'npm run dev' 启动开发服务器"
echo "  运行 'npx prisma studio' 打开数据库管理界面"
echo ""
