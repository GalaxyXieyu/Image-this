# Imagine This - 部署指南

这是一个完整的 Docker 化部署方案，支持一键启动和生产环境部署。

## 🚀 快速开始

### 1. 环境准备

确保你的服务器已安装：
- Docker (20.10+)
- Docker Compose (2.0+)
- Git

### 2. 克隆项目

```bash
git clone https://github.com/your-username/imagine-this-batch.git
cd imagine-this-batch
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.production .env

# 编辑环境变量
nano .env
```

**重要配置项：**
- `NEXTAUTH_URL`: 你的域名地址
- `NEXTAUTH_SECRET`: 随机生成的安全密钥
- `POSTGRES_PASSWORD`: 数据库密码
- `GPT_API_KEY`: GPT API 密钥
- `QWEN_API_KEY`: 通义千问 API 密钥
- `MINIO_ACCESS_KEY`: MinIO 访问密钥
- `MINIO_SECRET_KEY`: MinIO 安全密钥

### 4. 一键部署

```bash
# 给脚本执行权限
chmod +x deploy.sh

# 开始部署
./deploy.sh
```

## 📋 服务架构

### 服务组件

| 服务 | 端口 | 描述 |
|------|------|------|
| Nginx | 80, 443 | 反向代理和负载均衡 |
| App | 3000 (内部) | Next.js 应用 |
| PostgreSQL | 5432 (内部) | 主数据库 |
| MinIO | 9000, 9001 (内部) | 对象存储 |
| Redis | 6379 (内部) | 缓存和会话存储 |

### 网络架构

```
Internet → Nginx (80/443) → App (3000)
                         → MinIO (9000/9001)
                         → PostgreSQL (5432)
                         → Redis (6379)
```

## 🔧 管理命令

### 部署管理

```bash
# 部署服务
./deploy.sh

# 检查服务状态
./deploy.sh check

# 查看日志
./deploy.sh logs

# 重启服务
./deploy.sh restart

# 停止服务
./deploy.sh stop

# 清理所有数据（危险操作）
./deploy.sh clean
```

### 监控管理

```bash
# 检查服务状态
./scripts/monitor.sh status

# 检查资源使用
./scripts/monitor.sh resources

# 检查错误日志
./scripts/monitor.sh logs

# 完整检查
./scripts/monitor.sh full

# 生成监控报告
./scripts/monitor.sh report
```

### 数据库管理

```bash
# 备份数据库
./scripts/backup-db.sh

# 进入数据库
docker-compose exec db psql -U postgres -d imagine_this_db

# 查看数据库日志
docker-compose logs db
```

## 🌐 生产环境部署

### 1. 域名和 DNS 配置

1. 将你的域名 A 记录指向服务器 IP
2. 等待 DNS 传播完成（通常几分钟到几小时）

### 2. SSL 证书配置

```bash
# 自动获取 Let's Encrypt 证书
./scripts/setup-ssl.sh your-domain.com your-email@example.com
```

### 3. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 4. 系统优化

```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65536" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65536" >> /etc/sysctl.conf
sysctl -p
```

## 📊 监控和维护

### 健康检查

- 应用健康检查: `http://your-domain.com/health`
- MinIO 健康检查: `http://your-domain.com/minio/minio/health/live`

### 日志管理

```bash
# 查看应用日志
docker-compose logs -f app

# 查看 Nginx 日志
docker-compose logs -f nginx

# 查看所有服务日志
docker-compose logs -f
```

### 备份策略

1. **数据库备份**: 每日自动备份，保留7天
2. **文件备份**: 定期备份上传的文件
3. **配置备份**: 备份环境变量和配置文件

```bash
# 设置自动备份 (crontab)
0 2 * * * /path/to/project/scripts/backup-db.sh
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建和部署
./deploy.sh

# 运行数据库迁移（如果有）
docker-compose exec app npx prisma migrate deploy
```

## 🔒 安全配置

### 1. 环境变量安全

- 使用强密码和随机密钥
- 定期轮换 API 密钥
- 不要在代码中硬编码敏感信息

### 2. 网络安全

- 只暴露必要的端口（80, 443）
- 使用防火墙限制访问
- 启用 HTTPS 和 HSTS

### 3. 容器安全

- 定期更新基础镜像
- 使用非 root 用户运行应用
- 限制容器资源使用

## 🚨 故障排除

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查日志
   docker-compose logs
   
   # 检查端口占用
   netstat -tlnp | grep -E "(80|443|3000)"
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库状态
   docker-compose exec db pg_isready -U postgres
   
   # 重启数据库
   docker-compose restart db
   ```

3. **SSL 证书问题**
   ```bash
   # 检查证书有效期
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # 重新生成证书
   ./scripts/setup-ssl.sh your-domain.com
   ```

### 性能优化

1. **数据库优化**
   - 定期执行 VACUUM 和 ANALYZE
   - 监控慢查询
   - 适当增加连接池大小

2. **缓存优化**
   - 配置 Redis 内存限制
   - 使用适当的缓存策略
   - 监控缓存命中率

3. **静态文件优化**
   - 启用 Gzip 压缩
   - 设置适当的缓存头
   - 使用 CDN 加速

## 📞 支持

如果遇到问题，请：

1. 查看日志文件
2. 运行监控脚本检查系统状态
3. 查阅故障排除部分
4. 提交 Issue 到项目仓库

---

**注意**: 这是生产环境部署指南，请确保在部署前充分测试所有功能。
