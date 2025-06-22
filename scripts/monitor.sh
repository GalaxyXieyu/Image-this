#!/bin/bash

# 系统监控脚本

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

# 检查服务状态
check_services() {
    print_step "检查服务状态..."
    
    echo "=== Docker 容器状态 ==="
    docker-compose ps
    echo ""
    
    # 检查各个服务
    services=("nginx" "app" "db" "minio" "redis")
    
    for service in "${services[@]}"; do
        if docker-compose ps $service | grep -q "Up"; then
            print_message "$service: 运行中"
        else
            print_error "$service: 未运行"
        fi
    done
    echo ""
}

# 检查资源使用情况
check_resources() {
    print_step "检查资源使用情况..."
    
    echo "=== 容器资源使用 ==="
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
    echo ""
    
    echo "=== 系统资源 ==="
    echo "CPU 使用率:"
    top -l 1 | grep "CPU usage" || echo "无法获取 CPU 信息"
    
    echo ""
    echo "内存使用:"
    free -h 2>/dev/null || vm_stat | head -5
    
    echo ""
    echo "磁盘使用:"
    df -h | grep -E "(Filesystem|/dev/)"
    echo ""
}

# 检查日志错误
check_logs() {
    print_step "检查最近的错误日志..."
    
    echo "=== 应用错误日志 (最近10条) ==="
    docker-compose logs --tail=10 app | grep -i error || echo "无错误日志"
    echo ""
    
    echo "=== Nginx 错误日志 (最近10条) ==="
    docker-compose logs --tail=10 nginx | grep -i error || echo "无错误日志"
    echo ""
    
    echo "=== 数据库错误日志 (最近10条) ==="
    docker-compose logs --tail=10 db | grep -i error || echo "无错误日志"
    echo ""
}

# 检查网络连接
check_network() {
    print_step "检查网络连接..."
    
    echo "=== 端口监听状态 ==="
    netstat -tlnp 2>/dev/null | grep -E "(80|443|3000|5432|6379|9000|9001)" || echo "无法获取端口信息"
    echo ""
    
    echo "=== 健康检查 ==="
    if curl -f http://localhost/health &> /dev/null; then
        print_message "应用健康检查: 通过"
    else
        print_warning "应用健康检查: 失败"
    fi
    
    if curl -f http://localhost/minio/minio/health/live &> /dev/null; then
        print_message "MinIO 健康检查: 通过"
    else
        print_warning "MinIO 健康检查: 失败"
    fi
    echo ""
}

# 检查数据库
check_database() {
    print_step "检查数据库状态..."
    
    echo "=== 数据库连接 ==="
    if docker-compose exec -T db pg_isready -U postgres &> /dev/null; then
        print_message "数据库连接: 正常"
        
        echo ""
        echo "=== 数据库大小 ==="
        docker-compose exec -T db psql -U postgres -d imagine_this_db -c "
        SELECT 
            pg_database.datname,
            pg_size_pretty(pg_database_size(pg_database.datname)) AS size
        FROM pg_database
        WHERE pg_database.datname = 'imagine_this_db';
        " 2>/dev/null || echo "无法获取数据库大小"
        
        echo ""
        echo "=== 活跃连接数 ==="
        docker-compose exec -T db psql -U postgres -d imagine_this_db -c "
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active';
        " 2>/dev/null || echo "无法获取连接数"
        
    else
        print_error "数据库连接: 失败"
    fi
    echo ""
}

# 生成报告
generate_report() {
    local report_file="logs/monitor_report_$(date +%Y%m%d_%H%M%S).txt"
    mkdir -p logs
    
    print_step "生成监控报告..."
    
    {
        echo "=== Imagine This 系统监控报告 ==="
        echo "生成时间: $(date)"
        echo ""
        
        check_services
        check_resources
        check_network
        check_database
        check_logs
        
    } > $report_file
    
    print_message "监控报告已生成: $report_file"
}

# 主函数
main() {
    case "${1:-status}" in
        "status")
            check_services
            ;;
        "resources")
            check_resources
            ;;
        "logs")
            check_logs
            ;;
        "network")
            check_network
            ;;
        "database")
            check_database
            ;;
        "full")
            check_services
            check_resources
            check_network
            check_database
            check_logs
            ;;
        "report")
            generate_report
            ;;
        *)
            echo "使用方法: $0 [status|resources|logs|network|database|full|report]"
            echo ""
            echo "选项:"
            echo "  status    - 检查服务状态 (默认)"
            echo "  resources - 检查资源使用"
            echo "  logs      - 检查错误日志"
            echo "  network   - 检查网络连接"
            echo "  database  - 检查数据库状态"
            echo "  full      - 完整检查"
            echo "  report    - 生成监控报告"
            ;;
    esac
}

main $1
