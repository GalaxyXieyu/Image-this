#!/bin/bash

# SSL 证书设置脚本
# 使用 Let's Encrypt 自动生成 SSL 证书

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

# 检查参数
if [ $# -eq 0 ]; then
    print_error "请提供域名参数"
    echo "使用方法: $0 your-domain.com [email@example.com]"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

print_message "为域名 $DOMAIN 设置 SSL 证书"
print_message "联系邮箱: $EMAIL"

# 创建必要的目录
print_step "创建证书目录..."
mkdir -p nginx/ssl
mkdir -p certbot/conf
mkdir -p certbot/www

# 创建临时 nginx 配置用于验证
print_step "创建临时 nginx 配置..."
cat > nginx/conf.d/temp.conf << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# 更新 docker-compose 以包含 certbot
print_step "添加 Certbot 服务到 docker-compose..."
cat >> docker-compose.yml << EOF

  # Certbot for SSL certificates
  certbot:
    image: certbot/certbot
    container_name: imagine-this-certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    command: certonly --webroot -w /var/www/certbot --force-renewal --email $EMAIL -d $DOMAIN -d www.$DOMAIN --agree-tos
    depends_on:
      - nginx
    networks:
      - imagine-network
EOF

# 启动 nginx 进行域名验证
print_step "启动 nginx 进行域名验证..."
docker-compose up -d nginx

# 等待 nginx 启动
sleep 10

# 运行 certbot 获取证书
print_step "运行 Certbot 获取 SSL 证书..."
docker-compose run --rm certbot

# 检查证书是否生成成功
if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    print_message "SSL 证书生成成功！"
    
    # 复制证书到 nginx 目录
    print_step "复制证书到 nginx 目录..."
    cp certbot/conf/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    cp certbot/conf/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    
    # 创建生产环境 nginx 配置
    print_step "创建生产环境 nginx 配置..."
    sed "s/your-domain.com/$DOMAIN/g" nginx/conf.d/ssl.conf.template > nginx/conf.d/ssl.conf
    
    # 删除临时配置
    rm nginx/conf.d/temp.conf
    
    # 重启 nginx 应用新配置
    print_step "重启 nginx 应用 SSL 配置..."
    docker-compose restart nginx
    
    print_message "SSL 配置完成！"
    print_message "你的网站现在可以通过 https://$DOMAIN 访问"
    
    # 设置自动续期
    print_step "设置证书自动续期..."
    cat > scripts/renew-ssl.sh << EOF
#!/bin/bash
# SSL 证书自动续期脚本

cd /path/to/your/project
docker-compose run --rm certbot renew
if [ \$? -eq 0 ]; then
    cp certbot/conf/live/$DOMAIN/fullchain.pem nginx/ssl/cert.pem
    cp certbot/conf/live/$DOMAIN/privkey.pem nginx/ssl/key.pem
    docker-compose restart nginx
fi
EOF
    
    chmod +x scripts/renew-ssl.sh
    
    print_message "自动续期脚本已创建: scripts/renew-ssl.sh"
    print_warning "请将此脚本添加到 crontab 中，建议每月运行一次"
    print_warning "示例 crontab 条目: 0 3 1 * * /path/to/your/project/scripts/renew-ssl.sh"
    
else
    print_error "SSL 证书生成失败！"
    print_error "请检查域名是否正确指向此服务器"
    exit 1
fi
