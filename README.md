<div align="center">

# Imagine This

**专业的 AI 图像处理平台**

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[功能特性](#功能特性) • [技术栈](#技术栈) • [快速开始](#快速开始) • [部署](#部署) • [API 文档](#api-文档)

</div>

---

## 项目简介

**Imagine This** 是一个基于 Next.js 15 构建的现代化全栈 AI 图像处理平台，集成了多种先进的 AI 模型，为用户提供专业级的图像处理能力。

### 核心亮点

- **一键 AI 增强** - 智能扩图 + 高清化，一键完成专业级处理
- **智能换背景** - AI 自动识别主体，精准更换背景
- **智能扩图** - AI 智能扩展图片边界，保持内容自然连贯
- **AI 高清化** - 使用先进算法提升分辨率和细节
- **提示词模板** - 内置丰富的提示词模板系统
- **异步任务队列** - 非阻塞式处理，实时进度反馈
- **项目管理** - 完善的项目组织和图像管理功能

本平台采用现代化技术栈，架构清晰，易于扩展和部署。

### AI 图像处理能力

| 功能 | 描述 | API 端点 |
|------|------|----------|
| **一键 AI 增强** | 智能扩图 + 高清化组合工作流 | `/api/workflow/one-click` |
| **智能换背景** | AI 识别主体并替换背景 | `/api/volcengine/background-replace` |
| **智能扩图** | 扩展图片边界，保持内容连贯 | `/api/volcengine/outpaint` |
| **AI 高清化** | 提升图片分辨率和细节 | `/api/volcengine/upscale` |
| **文本生成图像** | 根据文本描述生成图像 | `/api/gpt/generate` |

### 核心功能

- **用户认证系统** - 基于 NextAuth.js 的安全认证
- **项目管理** - 创建项目组织和管理图像
- **图像历史** - 完整的处理历史记录和版本管理
- **提示词模板** - 可自定义的提示词模板系统
- **实时任务队列** - 异步处理，实时进度更新
- **图床集成** - 支持 Superbed 等图床服务
- **响应式设计** - 完美适配桌面和移动设备

![Architecture Diagram](https://i.imgur.com/your-architecture-diagram.png)
*(这是一个占位符，您可以用实际的架构图替换)*

### 前端技术

```
Next.js 15 (App Router)  - React 全栈框架
TypeScript 5             - 类型安全
React 19                 - UI 库
Tailwind CSS 3           - 原子化 CSS
shadcn/ui                - 高质量 UI 组件库
Framer Motion            - 动画库
React Hook Form          - 表单处理
Zod                      - 数据验证
Konva & React-Konva      - 画布操作
```

### 后端技术

```
Next.js API Routes       - RESTful API
Prisma ORM               - 类型安全的数据库访问
SQLite / PostgreSQL      - 数据库
NextAuth.js              - 身份认证
Axios                    - HTTP 客户端
Sharp                    - 图像处理
```

### AI 服务集成

```
火山引擎即梦 API         - 背景替换、扩图、高清化
GPT API                  - 文本生成图像
Superbed                 - 图床服务
```

### 开发工具

```
ESLint                   - 代码检查
Playwright               - E2E 测试
PM2                      - 进程管理
Docker                   - 容器化部署
Nginx                    - 反向代理
```

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

- Node.js 20.x 或更高版本
- pnpm 9.x (推荐) 或 npm
- SQLite (开发环境) / PostgreSQL (生产环境)

### 安装步骤

1. **克隆项目**

```bash
git clone https://github.com/yourusername/ai-images-generated.git
cd ai-images-generated
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

复制 `.env.example` 为 `.env` 并配置：

```env
# 数据库配置
DATABASE_URL="file:./dev.db"

# NextAuth.js 配置
NEXTAUTH_URL="http://localhost:23000"
NEXTAUTH_SECRET="your-super-secret-key-change-this"
```

4. **初始化数据库**

```bash
pnpm prisma migrate dev --name init
pnpm prisma generate
```

5. **启动开发服务器**

```bash
pnpm dev
```

访问 [http://localhost:23000](http://localhost:23000) 查看应用。

## 部署

### 使用 PM2 部署

1. **构建应用**

```bash
pnpm build
```

2. **启动应用**

```bash
pnpm pm2:start
```

3. **配置 Nginx**

参考 `nginx/conf.d/default.conf` 配置反向代理。

### 使用 Docker 部署

1. **构建镜像**

```bash
docker build -t imagine-this .
```

2. **运行容器**

```bash
docker run -d \
  -p 34000:3000 \
  --env-file .env \
  --name imagine-this \
  imagine-this
```

### Electron 桌面应用

```bash
# 开发模式
pnpm electron:dev

# 构建桌面应用
pnpm electron:build:mac    # macOS
pnpm electron:build:win    # Windows
pnpm electron:build:linux  # Linux
```

## API 文档

### 认证相关

- `POST /api/auth/signin` - 用户登录
- `POST /api/auth/signout` - 用户登出
- `POST /api/auth/signup` - 用户注册

### 项目管理

- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建新项目
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 图像处理

- `POST /api/images/upload` - 上传图像
- `GET /api/images` - 获取图像列表
- `DELETE /api/images/:id` - 删除图像

### AI 处理任务

- `POST /api/volcengine/background-replace` - 背景替换
- `POST /api/volcengine/outpaint` - 智能扩图
- `POST /api/volcengine/upscale` - AI 高清化
- `POST /api/workflow/one-click` - 一键 AI 增强
- `POST /api/gpt/generate` - 文本生成图像

### 任务队列

- `GET /api/tasks` - 获取任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `DELETE /api/tasks/:id` - 取消任务

### 提示词模板

- `GET /api/prompt-templates` - 获取模板列表
- `POST /api/prompt-templates` - 创建模板
- `PUT /api/prompt-templates/:id` - 更新模板
- `DELETE /api/prompt-templates/:id` - 删除模板

4.  **初始化数据库**
    Prisma 会根据 `schema.prisma` 文件创建数据库和表结构。
    ```bash
    pnpm prisma migrate dev --name init
    ```

```
ai-images-generated/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # 认证相关页面
│   │   ├── api/               # API 路由
│   │   ├── gallery/           # 图库页面
│   │   ├── history/           # 历史记录
│   │   ├── settings/          # 设置页面
│   │   └── workspace/         # 工作区页面
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 组件
│   │   ├── home/             # 首页组件
│   │   ├── navigation/       # 导航组件
│   │   └── workspace/        # 工作区组件
│   ├── features/             # 功能模块
│   │   └── workspace/        # 工作区功能
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具库
│   └── types/                # TypeScript 类型定义
├── prisma/                   # Prisma 数据库配置
│   ├── migrations/          # 数据库迁移
│   └── schema.prisma        # 数据库模型
├── public/                   # 静态资源
├── scripts/                  # 运维脚本
├── nginx/                    # Nginx 配置
├── electron/                 # Electron 配置
└── docker/                   # Docker 配置
```

## 开发指南

### 可用脚本

```bash
pnpm dev              # 启动开发服务器 (端口 23000)
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器 (端口 34000)
pnpm lint             # 运行代码检查
pnpm pm2:start        # 使用 PM2 启动
pnpm pm2:stop         # 停止 PM2 进程
pnpm pm2:restart      # 重启 PM2 进程
```

### 数据库操作

```bash
pnpm prisma studio           # 打开 Prisma Studio
pnpm prisma migrate dev      # 创建并应用迁移
pnpm prisma migrate deploy   # 应用迁移（生产环境）
pnpm prisma generate         # 生成 Prisma Client
```

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 UI 组件库
- [Prisma](https://www.prisma.io/) - 现代化 ORM
- [火山引擎即梦](https://www.volcengine.com/) - AI 图像处理服务

## 联系方式

- 项目主页: [https://github.com/yourusername/ai-images-generated](https://github.com/yourusername/ai-images-generated)
- 问题反馈: [Issues](https://github.com/yourusername/ai-images-generated/issues)

---

<div align="center">

**如果这个项目对你有帮助，欢迎给予 Star 支持**

Imagine This Team

</div>
