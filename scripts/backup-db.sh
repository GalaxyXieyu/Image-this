#!/bin/bash

# 数据库备份脚本

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

# 配置
BACKUP_DIR="database/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME=${POSTGRES_DB:-imagine_this_db}
DB_USER=${POSTGRES_USER:-postgres}

# 创建备份目录
mkdir -p $BACKUP_DIR

print_step "开始数据库备份..."

# 执行备份
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${DATE}.sql"

if docker-compose exec -T db pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE; then
    print_message "数据库备份成功: $BACKUP_FILE"
    
    # 压缩备份文件
    gzip $BACKUP_FILE
    print_message "备份文件已压缩: ${BACKUP_FILE}.gz"
    
    # 清理旧备份（保留最近7天）
    print_step "清理旧备份文件..."
    find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
    print_message "旧备份文件清理完成"
    
    # 显示备份文件大小
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    print_message "备份文件大小: $BACKUP_SIZE"
    
else
    print_error "数据库备份失败！"
    exit 1
fi

print_message "备份完成！"
