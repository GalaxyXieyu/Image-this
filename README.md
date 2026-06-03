<div align="center">

# Imagine This

**专业的 AI 图像与视频处理平台**

[![Next.js](https://img.shields.io/badge/Next.js-15.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Electron](https://img.shields.io/badge/Electron-39.x-47848F?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[功能特性](#功能特性) · [界面预览](#界面预览) · [技术栈](#技术栈) · [快速开始](#快速开始) · [API 文档](#api-文档)

</div>

---

## 项目简介

**Imagine This** 是一个基于 Next.js 15 构建的现代化全栈 AI 图像处理平台，支持 **Web 端** 和 **桌面端（Windows / macOS / Linux）** 多平台运行。集成多种先进的 AI 模型（Gemini、GPT-4o、通义千问、即梦、火山引擎），为用户提供专业级的图像处理与视频生成能力。

## 界面预览

### 首页
![首页](docs/screenshots/01-homepage.png)

### 工作区功能

<details>
<summary>📸 点击展开查看所有功能截图</summary>

#### 一键增强
![一键增强](docs/screenshots/workspace-01-oneclick.png)

#### 背景替换
![背景替换](docs/screenshots/workspace-02-background-replace.png)

#### 智能扩图
![智能扩图](docs/screenshots/workspace-03-outpaint.png)

#### 图像高清化
![图像高清化](docs/screenshots/workspace-04-enhance.png)

#### 叠加水印
![叠加水印](docs/screenshots/workspace-05-watermark.png)

</details>

### 任务中心
![任务中心](docs/screenshots/04-task-center.png)

### 图片库
![图片库](docs/screenshots/05-gallery.png)

## 功能特性

### 🎨 AI 图像处理

| 功能 | 描述 | 支持的 AI 模型 |
|------|------|---------------|
| **一键增强** | 背景替换 + 智能扩图 + 高清化 + 水印，一键完成 | Gemini / GPT-4o / 即梦 / 通义千问 |
| **智能换背景** | AI 自动识别主体，精准更换背景，保持产品细节 | Gemini / GPT-4o / 即梦 / 通义千问 |
| **智能扩图** | AI 智能扩展图片边界，保持内容自然连贯 | 火山引擎 |
| **AI 高清化** | 使用先进算法提升分辨率和细节，支持 HDR / 白平衡 | 火山引擎 |
| **叠加水印** | 支持文字水印和 Logo 水印，可拖拽定位、自由缩放 | 本地处理 |
| **图生视频** | 基于首帧图片生成 5s / 10s AI 视频 | 即梦 (火山引擎) |

### 🤖 智能质量审核

- 基于 Gemini 的自动质量评估，从 **产品细节保持**、**纹理一致性**、**背景融合度** 三个维度打分（1-10 分）
- 自动识别问题并给出提示词优化建议
- 支持一键保存高质量提示词为模板

### 📋 核心功能

- **用户认证系统** - 基于 NextAuth.js 的安全认证，支持注册登录
- **多提供商密钥管理** - 每个用户独立配置 Gemini、GPT、即梦、火山引擎、通义千问 API 密钥
- **任务队列系统** - 异步处理，支持批量任务，实时进度反馈，自动重试（最多 3 次）
- **项目管理** - 按项目分组管理图片和任务
- **图片库管理** - 按类型分类，支持文件夹管理
- **提示词模板** - 可自定义的提示词模板系统，支持系统预设 + 用户自定义
- **任务历史** - 完整的处理历史记录，支持重试、取消和查看详情
- **图床集成** - 支持 Superbed 图床服务，本地存储，可选 MinIO
- **桌面应用** - 支持 Windows、macOS、Linux 桌面端，内置自动更新
- **模型动态切换** - 工作区内可实时切换不同 AI 提供商和模型

## 技术栈

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.3 | React 全栈框架 (App Router) |
| React | 19 | UI 库 |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 原子化 CSS |
| shadcn/ui | - | 高质量 UI 组件库 |
| Motion | - | 动画库 |
| React Hook Form + Zod | - | 表单处理和验证 |
| React Konva | - | Canvas 水印编辑器 |

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API Routes | 15.3 | RESTful API |
| Prisma ORM | 5.22 | 类型安全的数据库访问 |
| SQLite | - | 数据库（开发 / 桌面端） |
| NextAuth.js | 4.x | 身份认证 |
| Sharp | - | 图像处理 |

### AI 服务
| 服务 | 用途 |
|------|------|
| Google Gemini | 背景替换、图像理解、质量审核 |
| GPT-4o (yunwu.ai) | 背景替换、图像理解 |
| 通义千问 (Qwen) | 背景替换 |
| 火山引擎即梦 | 背景替换、图生视频 |
| 火山引擎视觉 API | 智能扩图、画质增强 |
| Superbed | 图床服务 |

### 桌面端
| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 39.x | 桌面应用框架 |
| electron-builder | 26.x | 应用打包 |
| electron-updater | - | 自动更新 |

## 快速开始

### 环境要求

- Node.js 20.x - 23.x（推荐使用 LTS 版本）
- npm 或 pnpm

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/yourusername/ai-images-generated.git
cd ai-images-generated

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置 DATABASE_URL 和 NEXTAUTH_SECRET

# 4. 初始化数据库
# 默认配置会使用仓库内置的 SQLite 模板库：prisma/app.db（可直接启动）。
# 如果你希望使用全新的空库，请把 DATABASE_URL 改为 file:./dev.db，然后执行：
# npx prisma db push
# npx prisma generate

# 5. 启动开发服务器
npm run dev
```

访问 [http://localhost:34123](http://localhost:34123) 查看应用。

### 桌面端开发

```bash
# 同时启动 Web 服务和 Electron 桌面端
npm run electron:dev
```

## API 申请指南

本项目需要申请以下 API 服务才能正常使用所有功能。

### 1. GPT 和 Gemini API

用于图像理解、背景替换、质量审核等 AI 图像处理功能。

**注册地址：** [https://yunwu.zeabur.app/register?aff=lulv](https://yunwu.zeabur.app/register?aff=lulv)

**需要配置的渠道：**
- **Gemini**：用于图像理解、背景替换、质量审核
- **Azure OpenAI (GPT-4o)**：作为备选方案，提供图像理解能力

注册后在该平台创建 API Key，然后在应用的设置页面中配置对应渠道的 API Key 即可。

### 2. 火山引擎即梦 API

用于智能扩图、画质增强、视频生成等功能。

**功能页面地址：**
- **视频生成**：[https://console.volcengine.com/ai/ability/detail/2](https://console.volcengine.com/ai/ability/detail/2)
- **智能扩图**：[https://console.volcengine.com/ai/ability/detail/10](https://console.volcengine.com/ai/ability/detail/10)
- **背景替换**：[https://console.volcengine.com/ai/ability/detail/1](https://console.volcengine.com/ai/ability/detail/1)

**新建密钥地址：** [https://console.volcengine.com/iam/keymanage](https://console.volcengine.com/iam/keymanage)

> ⚠️ **注意：** 火山引擎的控制台页面比较分散，建议收藏以上链接方便后续查找。

### 3. 通义千问 API (可选)

用于背景替换功能备选方案。

## 部署

### 桌面应用打包（推荐）

```bash
# 打包 Windows 版本（自动清理缓存）
npm run build:windows

# 打包 macOS 版本（自动清理缓存）
npm run build:mac
```

打包产物位于 `dist-electron/` 目录：
- **Windows**: `ImagineThis-x.x.x-x64-Setup.exe`（安装版）、`ImagineThis-x.x.x-x64-Portable.exe`（便携版）
- **macOS**: `ImagineThis-x.x.x.dmg`（支持 Intel / Apple Silicon）

### Web 服务部署

```bash
# 构建
npm run build

# 启动生产服务
npm start
```

## API 文档

### 图像处理
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/images-process/workflow/one-click` | POST | 一键增强工作流 |
| `/api/images-process/background-replace` | POST | 背景替换 |
| `/api/images-process/outpaint` | POST | 智能扩图 |
| `/api/images-process/enhance` | POST | 画质增强 |
| `/api/images-process/watermark` | POST | 叠加水印 |

### 视频生成
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/jimeng-video/submit` | POST | 提交图生视频任务 |
| `/api/jimeng-video/query` | POST | 查询视频生成结果 |

### 质量审核
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/quality-review` | POST | AI 智能质量审核 |

### 任务管理
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/tasks` | GET / POST | 获取 / 创建任务 |
| `/api/tasks/:id` | GET / DELETE | 获取详情 / 删除 |
| `/api/tasks/retry` | POST | 重试失败任务 |
| `/api/tasks/recover` | POST | 恢复卡住的任务 |
| `/api/tasks/cron` | POST | 定时任务轮询 |
| `/api/tasks/worker` | POST | 任务处理器 |

### 图片与文件
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/images` | GET / POST | 获取 / 创建图片记录 |
| `/api/images/:id` | GET / DELETE | 获取 / 删除图片 |
| `/api/files/:path*` | GET | 本地文件访问 |

### 提示词模板
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/prompt-templates` | GET / POST | 获取 / 创建模板 |
| `/api/prompt-templates/:id` | PUT / DELETE | 更新 / 删除模板 |

### 项目与设置
| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/projects` | GET / POST | 获取 / 创建项目 |
| `/api/projects/:id` | GET / PUT / DELETE | 项目详情 / 更新 / 删除 |
| `/api/settings` | GET / PUT | 用户设置（含 API 密钥） |
| `/api/models` | GET | 获取可用 AI 模型列表 |

## 项目结构

```
ai-images-generated/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   │   ├── images-process/  # 图像处理 API
│   │   │   ├── jimeng-video/    # 视频生成 API
│   │   │   ├── quality-review/  # 质量审核 API
│   │   │   ├── tasks/           # 任务管理 API
│   │   │   └── ...
│   │   ├── auth/              # 认证页面
│   │   ├── gallery/           # 图片库页面
│   │   ├── history/           # 任务中心页面
│   │   ├── settings/          # 设置页面
│   │   └── workspace/         # 工作区页面
│   ├── components/            # React 组件
│   │   ├── ui/               # shadcn/ui 组件
│   │   └── workspace/        # 工作区组件
│   ├── lib/                  # 工具库
│   │   ├── image-processor/  # 图像处理核心（工厂模式）
│   │   └── ...
│   └── stores/               # Zustand 状态管理
├── prisma/                   # Prisma 数据库
│   └── schema.prisma        # 数据库模型
├── electron/                 # Electron 桌面端
├── scripts/                  # 构建脚本
├── docs/                     # 文档与截图
└── public/                   # 静态资源
```

## 开发指南

### 重新生成 README 截图

```bash
# 首次需要安装浏览器依赖
npx playwright install chromium

# 一键生成 README 截图
npm run screenshots:readme

# 如果你已经启动了服务
SCREENSHOT_SKIP_SERVER=true npm run screenshots:readme
```

生成产物：`docs/screenshots/*.png`

### 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (端口 34123)
npm run electron:dev     # 启动 Electron 开发模式

# 构建
npm run build            # 构建 Next.js
npm run build:windows    # 打包 Windows 桌面应用
npm run build:mac        # 打包 macOS 桌面应用

# 清理
npm run clean            # 清理构建缓存

# 数据库
npx prisma studio        # 打开 Prisma Studio
npx prisma db push       # 推送 schema 变更
npx prisma generate      # 生成 Prisma Client
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
- [火山引擎即梦](https://www.volcengine.com/) - AI 图像与视频处理服务

## 联系方式

- 项目主页: [https://github.com/yourusername/ai-images-generated](https://github.com/yourusername/ai-images-generated)
- 问题反馈: [Issues](https://github.com/yourusername/ai-images-generated/issues)

---

<div align="center">

**如果这个项目对你有帮助，欢迎给予 Star 支持**

Imagine This Team

</div>
