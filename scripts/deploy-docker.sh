#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_DIR="/root/data/Image-this"
BACKUP_DIR="/root/data/Image-this/backups"
COMPOSE_FILE="docker-compose.production.yml"
IMAGE_NAME="ghcr.io/galaxyxieyu/image-this:latest"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Imagine This - Docker Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 进入项目目录
cd "$PROJECT_DIR" || exit 1

# 1. 备份数据
echo -e "${YELLOW}[1/7] 📦 备份数据...${NC}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

if [ -f "data/app.db" ]; then
    cp data/app.db "$BACKUP_DIR/app.db.$TIMESTAMP"
    echo -e "${GREEN}✅ 数据库备份完成${NC}"
else
    echo -e "${YELLOW}⚠️  数据库文件不存在，跳过备份${NC}"
fi

if [ -d "public/uploads" ] && [ "$(ls -A public/uploads)" ]; then
    tar -czf "$BACKUP_DIR/uploads.$TIMESTAMP.tar.gz" public/uploads 2>/dev/null
    echo -e "${GREEN}✅ 上传文件备份完成${NC}"
else
    echo -e "${YELLOW}⚠️  上传目录为空，跳过备份${NC}"
fi

# 保留最近 10 个备份
ls -t "$BACKUP_DIR"/app.db.* 2>/dev/null | tail -n +11 | xargs rm -f || true
ls -t "$BACKUP_DIR"/uploads.*.tar.gz 2>/dev/null | tail -n +11 | xargs rm -f || true

echo ""

# 2. 拉取最新镜像
echo -e "${YELLOW}[2/7] 🐳 拉取 Docker 镜像...${NC}"
docker pull "$IMAGE_NAME" || {
    echo -e "${RED}❌ 镜像拉取失败！${NC}"
    exit 1
}
echo -e "${GREEN}✅ 镜像拉取完成${NC}"
echo ""

# 3. 停止旧容器
echo -e "${YELLOW}[3/7] 🛑 停止旧容器...${NC}"
docker compose -f "$COMPOSE_FILE" down || true
echo -e "${GREEN}✅ 旧容器已停止${NC}"
echo ""

# 4. 创建必要目录
echo -e "${YELLOW}[4/7] 📁 创建数据目录...${NC}"
mkdir -p data public/uploads
echo -e "${GREEN}✅ 目录准备完毕${NC}"
echo ""

# 5. 启动新容器
echo -e "${YELLOW}[5/7] 🚀 启动新容器...${NC}"
docker compose -f "$COMPOSE_FILE" up -d
echo -e "${GREEN}✅ 容器启动成功${NC}"
echo ""

# 6. 等待服务启动
echo -e "${YELLOW}[6/7] ⏳ 等待服务启动...${NC}"
sleep 15

# 7. 健康检查
echo -e "${YELLOW}[7/7] 🏥 执行健康检查...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTH_URL="http://localhost:34123/api/health"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo -e "${BLUE}✓ 尝试 $ATTEMPT/$MAX_ATTEMPTS...${NC}"

    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 健康检查通过！${NC}"
        echo ""

        # 清理旧镜像（保留 latest，删除其他版本）
        echo -e "${YELLOW}🧹 清理旧镜像...${NC}"
        docker images "$IMAGE_NAME" --format "{{.ID}} {{.Tag}}" | grep -v "latest" | awk '{print $1}' | xargs -r docker rmi -f 2>/dev/null || true
        docker image prune -f > /dev/null 2>&1
        echo -e "${GREEN}✅ 清理完成${NC}"
        echo ""

        echo -e "${GREEN}========================================${NC}"
        echo -e "${GREEN}   🎉 部署成功！${NC}"
        echo -e "${GREEN}========================================${NC}"
        echo -e "${BLUE}服务地址: http://38.76.197.25:34123${NC}"
        echo -e "${BLUE}健康检查: $HEALTH_URL${NC}"
        echo -e "${BLUE}查看日志: docker logs imagine-this-app${NC}"
        echo ""
        exit 0
    fi

    sleep 2
done

# 健康检查失败，执行回滚
echo ""
echo -e "${RED}========================================${NC}"
echo -e "${RED}   ❌ 健康检查失败！开始回滚...${NC}"
echo -e "${RED}========================================${NC}"
echo ""

# 查看容器日志
echo -e "${YELLOW}📋 容器日志：${NC}"
docker logs imagine-this-app --tail 50
echo ""

# 停止失败的容器
echo -e "${YELLOW}🛑 停止失败的容器...${NC}"
docker compose -f "$COMPOSE_FILE" down

# 恢复备份
if [ -f "$BACKUP_DIR/app.db.$TIMESTAMP" ]; then
    echo -e "${YELLOW}🔄 恢复数据库备份...${NC}"
    cp "$BACKUP_DIR/app.db.$TIMESTAMP" data/app.db
    echo -e "${GREEN}✅ 数据库已恢复${NC}"
fi

if [ -f "$BACKUP_DIR/uploads.$TIMESTAMP.tar.gz" ]; then
    echo -e "${YELLOW}🔄 恢复上传文件备份...${NC}"
    tar -xzf "$BACKUP_DIR/uploads.$TIMESTAMP.tar.gz"
    echo -e "${GREEN}✅ 上传文件已恢复${NC}"
fi

echo ""
echo -e "${RED}❌ 部署失败，已回滚。请检查日志。${NC}"
exit 1
