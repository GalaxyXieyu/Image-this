#!/bin/bash

# Imagine This 快速启动脚本
# 用于开发环境快速启动

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查环境
check_environment() {
    print_step "检查环境..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose 未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "Node.js/npm 未安装"
        exit 1
    fi
    
    print_message "环境检查通过"
}

# 安装依赖
install_dependencies() {
    print_step "安装项目依赖..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_message "依赖已安装，跳过"
    fi
}

# 设置环境变量
setup_env() {
    print_step "设置环境变量..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_message "已创建 .env 文件，请根据需要修改配置"
        else
            print_warning ".env.example 文件不存在"
        fi
    else
        print_message ".env 文件已存在"
    fi
}

# 启动开发服务
start_dev_services() {
    print_step "启动开发服务..."
    
    # 启动数据库等基础服务
    docker-compose -f docker-compose.dev.yml up -d
    
    print_message "等待服务启动..."
    sleep 15
    
    # 检查服务状态
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        print_message "服务启动成功"
    else
        print_error "服务启动失败"
        docker-compose -f docker-compose.dev.yml logs
        exit 1
    fi
}

# 初始化数据库
init_database() {
    print_step "初始化数据库..."
    
    # 等待数据库完全启动
    print_message "等待数据库启动..."
    sleep 10
    
    # 运行 Prisma 迁移
    if npx prisma migrate dev --name init; then
        print_message "数据库迁移完成"
    else
        print_warning "数据库迁移失败，可能已经初始化过"
    fi
    
    # 生成 Prisma 客户端
    npx prisma generate
}

# 启动开发服务器
start_dev_server() {
    print_step "启动开发服务器..."
    
    print_message "开发服务器将在 http://localhost:3000 启动"
    print_message "MinIO 控制台: http://localhost:9001 (minioadmin/minioadmin123)"
    print_message "数据库: localhost:5432 (postgres/password)"
    print_message ""
    print_message "按 Ctrl+C 停止开发服务器"
    print_message ""
    
    # 启动 Next.js 开发服务器
    npm run dev
}

# 清理函数
cleanup() {
    print_step "清理资源..."
    docker-compose -f docker-compose.dev.yml down
    print_message "开发环境已停止"
}

# 捕获退出信号
trap cleanup EXIT INT TERM

# 主函数
main() {
    print_message "启动 Imagine This 开发环境..."
    
    check_environment
    install_dependencies
    setup_env
    start_dev_services
    init_database
    start_dev_server
}

# 处理命令行参数
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        print_message "停止开发环境..."
        docker-compose -f docker-compose.dev.yml down
        print_message "开发环境已停止"
        ;;
    "restart")
        print_message "重启开发环境..."
        docker-compose -f docker-compose.dev.yml restart
        print_message "开发环境已重启"
        ;;
    "logs")
        docker-compose -f docker-compose.dev.yml logs -f
        ;;
    "clean")
        print_warning "这将删除所有开发环境数据！"
        read -p "确定要继续吗? (y/n): " confirm
        if [ "$confirm" = "y" ]; then
            docker-compose -f docker-compose.dev.yml down -v
            docker system prune -f
            print_message "开发环境已清理"
        fi
        ;;
    *)
        echo "使用方法: $0 [start|stop|restart|logs|clean]"
        echo ""
        echo "选项:"
        echo "  start   - 启动开发环境 (默认)"
        echo "  stop    - 停止开发环境"
        echo "  restart - 重启开发环境"
        echo "  logs    - 查看日志"
        echo "  clean   - 清理开发环境"
        ;;
esac
