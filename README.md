# Imagine This - AI 图像处理平台

专业的 AI 图像处理平台，支持背景替换、图像扩展、高清化等功能。

## 功能特性

- 🎯 **一键AI增强** - 智能扩图 + AI高清化
- 🖼️ **智能换背景** - AI自动识别主体，智能更换背景
- 📐 **智能扩图** - AI智能扩展图片边界，保持内容自然连贯
- ⚡ **AI高清化** - 使用先进AI算法，智能提升图片分辨率
- 👤 **用户系统** - 支持邮箱/Google/GitHub登录
- 📁 **项目管理** - 组织和管理您的图像处理项目

## 技术栈

- **前端**: Next.js 15, React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **认证**: NextAuth.js
- **数据库**: PostgreSQL, Prisma ORM
- **AI APIs**: GPT-4o, 通义千问 (Qwen)
- **存储**: 可选 MinIO 对象存储
- **部署**: Docker, Docker Compose

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Docker (可选)

### 本地开发

1. **克隆项目**
   ```bash
   git clone <project-url>
   cd imagine-this-batch
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   编辑 `.env` 文件，配置以下必要参数：
   - `DATABASE_URL`: PostgreSQL 连接字符串
   - `NEXTAUTH_SECRET`: 认证密钥
   - `GPT_API_URL` & `GPT_API_KEY`: GPT-4o API 配置
   - `QWEN_API_KEY`: 通义千问 API Key

4. **初始化数据库**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **启动开发服务器**
   ```bash
   npm run dev
   ```

   访问 [http://localhost:3000](http://localhost:3000)

### Docker 部署

1. **使用 Docker Compose (推荐)**
   ```bash
   # 构建并启动所有服务
   docker-compose up -d
   
   # 初始化数据库
   docker-compose exec app npx prisma generate
   docker-compose exec app npx prisma db push
   ```

2. **单独构建 Docker 镜像**
   ```bash
   docker build -t imagine-this .
   docker run -p 3000:3000 imagine-this
   ```

## API 配置

### GPT-4o API
用于背景替换和图像生成功能。

### 通义千问 API
用于图像扩图和高清化功能：

- **扩图 API**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/out-painting`
- **高清化 API**: `https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis`

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 认证页面
│   ├── api/               # API Routes
│   │   ├── auth/          # 认证相关 API
│   │   ├── gpt/           # GPT-4o API
│   │   ├── qwen/          # 通义千问 API
│   │   └── workflow/      # 工作流 API
│   ├── workspace/         # 主工作台
│   └── layout.tsx
├── components/            # React 组件
│   └── ui/               # UI 组件库
├── lib/                   # 工具函数
│   ├── prisma.ts         # 数据库配置
│   └── utils.ts          # 通用工具
└── providers/            # Context Providers
    └── auth-provider.tsx # 认证 Provider
```

## 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 代码检查
npm run lint

# 数据库操作
npx prisma generate     # 生成 Prisma 客户端
npx prisma db push      # 推送数据库 schema
npx prisma studio       # 打开数据库管理界面
```

## 环境变量

| 变量名 | 描述 | 必需 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ |
| `NEXTAUTH_URL` | 应用基础 URL | ✅ |
| `NEXTAUTH_SECRET` | NextAuth.js 密钥 | ✅ |
| `GPT_API_URL` | GPT-4o API 端点 | ✅ |
| `GPT_API_KEY` | GPT-4o API Key | ✅ |
| `QWEN_API_KEY` | 通义千问 API Key | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | ❌ |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | ❌ |
| `GITHUB_CLIENT_ID` | GitHub OAuth ID | ❌ |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Secret | ❌ |
| `MINIO_ENDPOINT` | MinIO 服务端点 | ❌ |
| `MINIO_ACCESS_KEY` | MinIO 访问密钥 | ❌ |
| `MINIO_SECRET_KEY` | MinIO 私钥 | ❌ |

## 🚀 一键部署

### 生产环境部署（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-username/imagine-this-batch.git
cd imagine-this-batch

# 2. 配置环境变量
cp .env.production .env
nano .env  # 编辑配置

# 3. 一键部署
./deploy.sh
```

部署完成后访问：
- **主应用**: http://localhost
- **MinIO 控制台**: http://localhost/minio-console
- **健康检查**: http://localhost/health

### 开发环境快速启动

```bash
# 快速启动开发环境
./quick-start.sh

# 停止开发环境
./quick-start.sh stop
```

### 管理命令

```bash
# 服务管理
./deploy.sh check          # 检查服务状态
./deploy.sh logs           # 查看日志
./deploy.sh restart        # 重启服务
./deploy.sh stop           # 停止服务

# 系统监控
./scripts/monitor.sh full  # 完整系统检查
./scripts/monitor.sh report # 生成监控报告

# 数据库管理
./scripts/backup-db.sh     # 备份数据库
```

### SSL 证书配置

```bash
# 自动获取 Let's Encrypt 证书
./scripts/setup-ssl.sh your-domain.com your-email@example.com
```

## 🐳 Docker 架构

### 服务组件

| 服务 | 端口 | 描述 |
|------|------|------|
| Nginx | 80, 443 | 反向代理和负载均衡 |
| App | 3000 (内部) | Next.js 应用 |
| PostgreSQL | 5432 (内部) | 主数据库 |
| MinIO | 9000, 9001 (内部) | 对象存储 |
| Redis | 6379 (内部) | 缓存和会话存储 |

### 配置文件

- `docker-compose.yml`: 生产环境完整配置
- `docker-compose.dev.yml`: 开发环境配置
- `nginx/`: Nginx 反向代理配置
- `scripts/`: 部署和管理脚本

### 生产环境注意事项

1. **安全配置**
   - 修改默认密码和密钥
   - 配置防火墙规则
   - 启用 HTTPS

2. **性能优化**
   - 配置适当的资源限制
   - 启用 Gzip 压缩
   - 设置缓存策略

3. **监控和备份**
   - 定期备份数据库
   - 监控系统资源使用
   - 设置日志轮转

4. **更新维护**
   - 定期更新依赖
   - 监控安全漏洞
   - 测试备份恢复

## 许可证

MIT License
