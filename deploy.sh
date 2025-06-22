#!/bin/bash

# Imagine This 项目部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    print_step "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    print_message "依赖检查通过"
}

# 创建必要的目录
create_directories() {
    print_step "创建必要的目录..."
    
    mkdir -p nginx/ssl
    mkdir -p database/backups
    mkdir -p logs
    
    print_message "目录创建完成"
}

# 检查环境变量文件
check_env_file() {
    print_step "检查环境变量文件..."
    
    if [ ! -f .env ]; then
        if [ -f .env.production ]; then
            print_warning ".env 文件不存在，复制 .env.production 为模板"
            cp .env.production .env
            print_warning "请编辑 .env 文件并设置正确的配置值"
            read -p "是否现在编辑 .env 文件? (y/n): " edit_env
            if [ "$edit_env" = "y" ]; then
                ${EDITOR:-nano} .env
            fi
        else
            print_error ".env 文件不存在，请创建环境变量文件"
            exit 1
        fi
    fi
    
    print_message "环境变量文件检查完成"
}

# 构建和启动服务
deploy_services() {
    local env_type=${1:-prod}
    
    print_step "部署服务 (环境: $env_type)..."
    
    # 停止现有服务
    print_message "停止现有服务..."
    docker-compose down --remove-orphans
    
    # 构建镜像
    print_message "构建应用镜像..."
    docker-compose build --no-cache app
    
    # 启动服务
    print_message "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    print_message "等待服务启动..."
    sleep 30
    
    # 运行数据库迁移
    print_message "运行数据库迁移..."
    docker-compose exec app npx prisma migrate deploy || true
    docker-compose exec app npx prisma generate || true
    
    print_message "服务部署完成"
}

# 检查服务状态
check_services() {
    print_step "检查服务状态..."
    
    echo "服务状态:"
    docker-compose ps
    
    echo ""
    echo "健康检查:"
    
    # 检查应用健康状态
    if curl -f http://localhost/health &> /dev/null; then
        print_message "应用服务: 健康"
    else
        print_warning "应用服务: 不健康"
    fi
    
    # 检查数据库
    if docker-compose exec -T db pg_isready -U postgres &> /dev/null; then
        print_message "数据库服务: 健康"
    else
        print_warning "数据库服务: 不健康"
    fi
    
    # 检查 MinIO
    if curl -f http://localhost/minio/minio/health/live &> /dev/null; then
        print_message "MinIO 服务: 健康"
    else
        print_warning "MinIO 服务: 不健康"
    fi
    
    # 检查 Redis
    if docker-compose exec -T redis redis-cli ping &> /dev/null; then
        print_message "Redis 服务: 健康"
    else
        print_warning "Redis 服务: 不健康"
    fi
}

# 显示访问信息
show_access_info() {
    print_step "访问信息:"
    
    echo "应用地址: http://localhost"
    echo "MinIO 控制台: http://localhost/minio-console"
    echo "健康检查: http://localhost/health"
    echo ""
    echo "服务端口映射:"
    echo "- Nginx: 80, 443"
    echo "- 应用内部端口: 3000"
    echo "- 数据库内部端口: 5432"
    echo "- MinIO 内部端口: 9000, 9001"
    echo "- Redis 内部端口: 6379"
}

# 主函数
main() {
    local env_type=${1:-prod}
    
    print_message "开始部署 Imagine This 项目..."
    
    check_dependencies
    create_directories
    check_env_file
    deploy_services $env_type
    
    print_message "等待服务完全启动..."
    sleep 10
    
    check_services
    show_access_info
    
    print_message "部署完成！"
}

# 脚本入口
if [ "$1" = "check" ]; then
    check_services
elif [ "$1" = "logs" ]; then
    docker-compose logs -f
elif [ "$1" = "stop" ]; then
    print_message "停止所有服务..."
    docker-compose down
elif [ "$1" = "restart" ]; then
    print_message "重启服务..."
    docker-compose restart
elif [ "$1" = "clean" ]; then
    print_warning "这将删除所有容器、镜像和数据卷！"
    read -p "确定要继续吗? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        docker-compose down -v --rmi all
        docker system prune -f
        print_message "清理完成"
    fi
else
    main $1
fi
