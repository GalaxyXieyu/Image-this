# ImagineThis - AI 图像处理与创作平台

ImagineThis 是一个基于 Next.js 构建的全栈 Web 应用，为用户提供强大的 AI 图像处理与创作功能。用户可以上传图片，利用集成的多种 AI 模型进行背景替换、图像扩展、分辨率提升、一键式工作流处理以及直接通过文本生成图像。

本平台采用现代化技术栈，架构清晰，易于扩展和部署。

## 技术架构

![Architecture Diagram](https://i.imgur.com/your-architecture-diagram.png)
*(这是一个占位符，您可以用实际的架构图替换)*

### **核心组件**

*   **前端 (Frontend):**
    *   **框架:** [Next.js 15](https://nextjs.org/) (使用 App Router)
    *   **语言:** [TypeScript](https://www.typescriptlang.org/)
    *   **UI 库:** [Tailwind CSS](https://tailwindcss.com/) 结合 [shadcn/ui](https://ui.shadcn.com/)，提供了一套美观、可定制的组件。
    *   **状态管理:** 主要通过 React Hooks 和组件状态，配合 Next.js 的服务端能力进行数据管理。
    *   **表单处理:** 使用 [React Hook Form](https://react-hook-form.com/) 和 [Zod](https://zod.dev/) 进行高效、类型安全的表单验证。

*   **后端 (Backend):**
    *   **框架:** 基于 Next.js API Routes 构建，实现了 BFF (Backend for Frontend) 模式。
    *   **数据库 ORM:** [Prisma](https://www.prisma.io/)，提供了类型安全的数据库访问。
    *   **数据库:** 开发环境使用 [SQLite](https://www.sqlite.org/index.html)，生产环境可配置为 PostgreSQL 或 MySQL。
    *   **用户认证:** [NextAuth.js](https://next-auth.js.org/)，轻松集成多种登录方式（如邮箱/密码、OAuth）。
    *   **异步任务队列:** 内置了一个基于数据库的任务队列系统 (`TaskQueue` 模型)，用于处理耗时的 AI 计算任务，避免阻塞 API 请求，提升用户体验。

*   **AI 服务集成:**
    *   项目通过 API 路由 (`src/app/api/`) 动态调用外部或自托管的 AI 模型服务。
    *   已集成的服务包括 `gpt` 和 `qwen`，支持以下功能：
        *   **文本生成图像 (GPT-Generation)**
        *   **背景替换 (Background-Replace)**
        *   **图像扩展 (Outpainting)**
        *   **分辨率提升 (Upscaling)**
        *   **一键式工作流 (One-Click Workflow)**

*   **基础设施 (Infrastructure):**
    *   **Web 服务器 & 反向代理:** [Nginx](https://www.nginx.com/)，处理静态资源、负载均衡和 SSL 加密。
    *   **进程管理:** [PM2](https://pm2.keymetrics.io/)，用于在生产环境中守护和管理 Next.js 应用进程。
    *   **文件存储:** 支持多种对象存储服务，已集成 [MinIO](https://min.io/) 和 [阿里云 OSS](https://www.aliyun.com/product/oss)。
    *   **容器化:** 提供 `Dockerfile`，支持使用 [Docker](https://www.docker.com/) 进行标准化部署。
    *   **运维脚本:** `scripts/` 目录下提供了数据库备份、日志管理、服务监控等实用脚本。

### **数据模型**

Prisma schema (`prisma/schema.prisma`) 定义了核心数据模型：

*   `User`: 存储用户信息。
*   `Project`: 用户可以创建项目来组织其图像。
*   `ProcessedImage`: 存储上传的原始图片信息、处理后的图片 URL、处理类型和状态等。
*   `TaskQueue`: 异步任务队列，记录了每个 AI 处理任务的详细信息，包括类型、状态、进度、输入输出数据等。这是实现非阻塞 AI 处理的关键。
*   `Account`, `Session`, `VerificationToken`: NextAuth.js 所需的标准模型。

## 如何启动

### **1. 环境准备**

*   [Node.js](https://nodejs.org/) (建议版本 v20.x 或更高)
*   [pnpm](https://pnpm.io/) (推荐使用 pnpm 进行依赖管理)
*   [Docker](https://www.docker.com/) 和 [Docker Compose](https://docs.docker.com/compose/) (如果使用 Docker 部署)

### **2. 项目设置**

1.  **克隆仓库**
    ```bash
    git clone <your-repository-url>
    cd imagine-this-nextjs
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **配置环境变量**
    复制 `.env.example` 文件为 `.env`，并根据您的环境填写以下变量：
    ```env
    # 数据库 URL (Prisma)
    DATABASE_URL="file:./dev.db"

    # NextAuth.js 配置
    NEXTAUTH_URL="http://localhost:34000"
    NEXTAUTH_SECRET="your-super-secret-key" # 生成一个随机密钥

    # AI 服务端点 (根据您的实际部署填写)
    QWEN_API_BASE_URL="http://<qwen-api-server-ip>:<port>"
    GPT_API_BASE_URL="http://<gpt-api-server-ip>:<port>"

    # 对象存储配置 (以 MinIO 为例)
    MINIO_ENDPOINT="127.0.0.1"
    MINIO_PORT="9000"
    MINIO_ACCESS_KEY="your-minio-access-key"
    MINIO_SECRET_KEY="your-minio-secret-key"
    MINIO_BUCKET="imagine-this"
    MINIO_USE_SSL=false
    ```

4.  **初始化数据库**
    Prisma 会根据 `schema.prisma` 文件创建数据库和表结构。
    ```bash
    pnpm prisma migrate dev --name init
    ```

### **3. 本地开发**

执行以下命令启动本地开发服务器：

```bash
pnpm dev
```

应用将运行在 `http://localhost:3000` (或您在 `package.json` 中配置的其他端口)。

### **4. 生产构建与部署**

#### **方式一：使用 PM2 (传统部署)**

1.  **构建应用**
    Next.js 会将应用打包成一个优化的独立版本。
    ```bash
    pnpm build
    ```
    构建产物位于 `.next/standalone/`。

2.  **启动应用**
    使用 PM2 启动应用。`ecosystem.config.js` 文件已经为您配置好了。
    ```bash
    pnpm pm2:start
    ```

3.  **配置 Nginx**
    将 `nginx/conf.d/default.conf` 复制到您的 Nginx 配置目录 (例如 `/etc/nginx/conf.d/`)，并根据您的域名和端口进行修改。然后重载 Nginx。

#### **方式二：使用 Docker**

1.  **构建 Docker 镜像**
    ```bash
    docker build -t imagine-this-nextjs .
    ```

2.  **运行 Docker 容器**
    ```bash
    docker run -p 34000:34000 --env-file .env imagine-this-nextjs
    ```
    *(注意：请确保 `.env` 文件中的 `DATABASE_URL` 指向一个容器可以访问的数据库地址)*

## **项目脚本**

*   `pnpm dev`: 启动开发服务器。
*   `pnpm build`: 构建生产版本。
*   `pnpm start`: 在生产模式下启动应用 (不通过 PM2)。
*   `pnpm lint`: 运行 ESLint 代码检查。
*   `pnpm pm2:start`: 使用 PM2 启动应用。
*   `pnpm pm2:stop`: 使用 PM2 停止应用。
*   `pnpm pm2:restart`: 使用 PM2 重启应用。

## **API 端点概览**

所有 API 路由都位于 `src/app/api/` 下，例如：

*   `/api/auth/...`: 用户认证相关 (由 NextAuth.js 管理)。
*   `/api/projects`: 创建和获取项目。
*   `/api/images`: 上传和管理图片。
*   `/api/tasks`: 创建和查询异步任务状态。
*   `/api/gpt/generate`: 文本生成图像。
*   `/api/qwen/upscale`: 图像超分辨率。

---
*该 README 文档由 Gemini 自动生成。*
