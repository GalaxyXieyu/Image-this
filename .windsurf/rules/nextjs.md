---
trigger: always_on
---

# Next.js 全栈 AI 应用 - 技术架构指南

> **🚀 AI 时代的 Next.js 全栈开发完整指南**  
> 基于 Next.js 15 + TypeScript 5 + AI 集成的现代化全栈应用开发架构

## 🚀 快速开始检查清单

### 环境准备
- [ ] Node.js 20.x LTS
- [ ] pnpm 9.x
- [ ] PostgreSQL 数据库
- [ ] AI API Key（OpenAI/Anthropic）
nextj
### 项目初始化
```bash
npx create-next-app@latest nextjs-ai-app --typescript --tailwind --app
cd nextjs-ai-app
pnpm install
```

### 核心依赖
```bash
pnpm add drizzle-orm postgres zod next-auth@beta
pnpm add ai @ai-sdk/openai zustand
npx shadcn-ui@latest init
```

### AI 工具配置（可选）
- 配置 Shadcn-MCP：在 `.cursor/mcp.json` 添加 shadcn 服务器
- 测试 AI 组件搜索功能

---

## 📋 指南概述

本指南涵盖从项目初始化到生产部署的完整技术栈，特别针对 **AI 辅助开发** 场景优化，集成 Shadcn-MCP 等 AI 友好工具。

### 🎯 适用场景
- **AI 辅助全栈开发** - 利用 AI 工具提升开发效率
- **现代化 Web 应用** - 基于 Next.js 15 App Router
- **AI 功能集成** - 聊天、RAG、智能体等 AI 能力
- **企业级项目** - 完整的架构设计和最佳实践
- **团队协作开发** - 标准化的代码组织和开发流程

### 🌟 核心特色

#### AI 友好设计
- **Shadcn-MCP 集成** - AI 可直接搜索和使用 UI 组件
- **组件库生态** - 支持多个高质量组件库（Shadcn UI、Aceternity UI 等）
- **AI 工具链** - Vercel AI SDK、LangGraph.js、CopilotKit 完整集成

#### 现代化架构
- **Next.js 15 App Router** - 最新的 React 服务端组件模式
- **TypeScript 5** - 完整的类型安全保障
- **Drizzle ORM** - 轻量高性能的数据库 ORM
- **Server Actions** - 简化后端逻辑开发

#### 开发体验优化
- **Feature 模块化** - 高内聚的模块组织方式
- **完整的开发工具链** - ESLint、Prettier、Playwright
- **标准化流程** - 从开发到部署的完整规范

---

**版本:** 1.0 | **日期:** 2025-11-20 | **适用项目:** 大型 Next.js 15 + AI 集成应用

## 1. 技术栈总览

### 1.1 核心框架层

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.x | 全栈框架（App Router） |
| TypeScript | 5.x | 类型安全 |
| pnpm | 9.x | 包管理器 |
| Node.js | 20.x LTS | 运行时环境 |

### 1.2 数据层

#### Drizzle ORM
- **选择理由:** 轻量、性能优异、SQL-like API、TypeScript 原生支持
- **安装:** `pnpm add drizzle-orm postgres`
- **开发依赖:** `pnpm add -D drizzle-kit`

#### Zod 数据验证
- **用途:** 所有 Server Actions、API 输入验证
- **安装:** `pnpm add zod`

### 1.3 后端逻辑层

#### Server Actions
- **用途:** CRUD 操作、表单提交、数据变更
- **适用场景:** 简单 CRUD、表单提交、不需要公开 API、数据变更操作

#### API Routes
- **适用场景:** Webhook 接收、第三方服务调用、需要公开的 REST API

### 1.4 状态管理

#### Zustand（客户端全局状态）
- **安装:** `pnpm add zustand`
- **使用场景:** 用户偏好设置、UI 状态、全局通知状态

### 1.5 UI 层

#### Tailwind CSS V3
- **配置文件:** `tailwind.config.ts`
- **插件:** `tailwindcss-animate`

#### Shadcn/ui（组件库）- AI 友好设计

**核心理念:**
专为 AI 辅助编程设计的革命性组件库：
- **源码可见**: 所有组件直接复制到项目中，AI 可直接读取和理解
- **完全可定制**: 可直接修改组件源码，完全控制组件行为和样式
- **设计统一**: 基于 Radix UI 和 Tailwind CSS，提供统一设计语言
- **AI 友好**: 组件代码在项目中，AI 无需查阅外部文档即可使用

**基础配置:**
- **初始化:** `npx shadcn-ui@latest init`
- **组件位置:** `components/ui/`
- **核心组件:** button, card, form, dialog, toast

#### Shadcn-MCP 集成（AI 组件搜索）

**什么是 Shadcn-MCP:**
shadcn/ui 官方提供的 MCP 服务器，允许 AI 助手直接访问和搜索组件库信息。

**工作原理:**
```
AI 助手 → Shadcn-MCP 服务器 → 组件注册表 → 组件信息(代码、示例、依赖)
```

**配置步骤:**

1. **安装 Shadcn-MCP**
   在 Cursor 的 MCP 配置文件 (`.cursor/mcp.json`) 中添加：
   ```json
   {
     "mcpServers": {
       "shadcn": {
         "command": "npx",
         "args": ["shadcn@latest", "mcp"]
       }
     }
   }
   ```

2. **配置组件注册表**
   在项目的 `components.json` 文件中配置：
   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "default",
     "typescript": true,
     "registries": {
       "@shadcn": "https://ui.shadcn.com/r",
       "@aceternity": "https://ui.aceternity.com/registry",
       "@jollyui": "https://www.jollyui.dev/r",
       "@diceui": "https://www.diceui.com/r"
     }
   }
   ```

**支持的组件库:**

| 组件库 | 端点 | 组件数 | 特点 | 适用场景 |
|--------|------|--------|------|----------|
| Shadcn UI | `https://ui.shadcn.com/r` | 54个 | 官方组件库，最稳定 | 基础 UI 组件 |
| Aceternity UI | `https://ui.aceternity.com/registry` | 93个 | 专业级 Next.js 组件，动画丰富 | 现代化动感界面 |
| JollyUI | `https://www.jollyui.dev/r` | 35个 | 基于 React Aria，可访问性强 | 无障碍支持组件 |
| Dice UI | `https://www.diceui.com/r` | 26个 | 简洁实用，易于定制 | 快速开发，轻量项目 |

**AI 使用方式:**
- "帮我搜索一个适合做聊天界面的组件"
- "查看 @aceternity 注册表中的动画组件"
- "给我看看 button 组件的代码示例"

**最佳实践:**
- **基础功能**: 使用 Shadcn UI
- **动画效果**: 使用 Aceternity UI  
- **无障碍需求**: 使用 JollyUI
- **快速开发**: 使用 Dice UI

#### Framer Motion（动画库）
- **安装:** `pnpm add framer-motion`

### 1.6 认证授权

#### Auth.js v5（NextAuth）
- **安装:** `pnpm add next-auth@beta`
- **适配器:** `@auth/drizzle-adapter`
- **Provider 支持:** GitHub, Google, 等

### 1.7 AI 集成层

#### Vercel AI SDK（核心）
- **安装:** 
  ```bash
  pnpm add ai @ai-sdk/openai
  pnpm add @ai-sdk/anthropic # 可选：Claude
  pnpm add @ai-sdk/google # 可选：Gemini
  ```
- **功能:** 聊天流式响应、结构化输出、Tool Calling

#### LangGraph.js
- **用途:** 复杂 AI 工作流编排、多智能体协作
- **安装:** `pnpm add @langchain/langgraph`
- **特性:** 状态机模型、流式输入/输出、TypeScript 支持

#### CopilotKit（应用内 AI 助手）
- **安装:** `pnpm add @copilotkit/react-core @copilotkit/react-ui`
- **用途:** 在应用内嵌入 AI Copilot，理解应用上下文并执行操作

### 1.8 测试层

#### Playwright（E2E 测试）
- **安装:** `pnpm add -D @playwright/test`
- **配置文件:** `playwright.config.ts`

## 2. 项目架构设计

### 2.1 目录结构

```
my-project/
├── app/                    # Next.js App Router
│ ├── (auth)/              # 路由组：认证
│ ├── (dashboard)/         # 路由组：控制台
│ ├── api/                 # API 路由
│ ├── globals.css          # 全局样式
│ └── layout.tsx           # 根布局
│
├── components/            # UI 组件
│ ├── ui/                  # Shadcn/ui 基础组件
│ └── [feature]/           # 功能组件
│
├── lib/                   # 工具库
│ ├── db/                  # 数据库配置
│ │ ├── index.ts           # Drizzle 客户端
│ │ └── schema.ts          # 数据库 Schema
│ ├── auth.ts              # Auth.js 配置
│ ├── ai.ts                # AI SDK 配置
│ ├── utils.ts             # 工具函数
│ └── constants.ts         # 常量
│
├── stores/                # Zustand 状态
│ ├── use-user-store.ts
│ ├── use-ui-store.ts
│ └── use-chat-store.ts
│
├── config/                # 配置文件
│ ├── site.ts              # 站点配置
│ ├── nav.ts               # 导航配置
│ └── env.ts               # 环境变量验证
│
├── features/              # 业务功能模块
│ ├── posts/               # 文章功能
│ └── users/               # 用户功能
│
├── types/                 # TypeScript 类型
├── e2e/                   # Playwright 测试
└── public/                # 静态资源
```

**优势:**
- 高内聚，模块边界清晰
- 易于团队协作（按功能分工）
- 可以轻松提取为独立包

### 2.2 Feature 模块设计原则

每个 Feature 独立包含：
```
features/[feature-name]/
├── components/ # 功能专属 UI 组件
├── lib/
│ ├── server/ # Server Actions + 查询
│ ├── schemas/ # Zod 验证 Schema
│ └── hooks/ # React Hooks
└── types/ # TypeScript 类型
```

**优势:**
- 高内聚，模块边界清晰
- 易于团队协作（按功能分工）
- 可以轻松提取为独立包

### 2.3 Server Actions 命名规范

- **创建:** `create[Entity]`
- **更新:** `update[Entity]`
- **删除:** `delete[Entity]`
- **查询:** `get[Entity]` / `get[Entity]List`
- **复杂操作:** 动词 + 名词（如 `publishPost`）

### 2.4 数据库 Schema 规范

- **表名:** 复数形式
- **主键:** `id` (UUID)
- **时间戳:** `created_at` / `updated_at`
- **外键:** `[entity]_id`
- **业务字段:** camelCase

### 2.5 环境变量管理

**核心环境变量:**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

## 3. 开发规范

### 3.1 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | PostCard, UserProfile |
| 文件 | kebab-case | post-card.tsx, use-auth.ts |
| 函数 | camelCase | getUserById, handleSubmit |
| 常量 | UPPER_SNAKE_CASE | MAX_FILE_SIZE, API_URL |
| 类型 | PascalCase | User, PostInput |

### 3.2 组件规范

#### 服务端组件（默认）
- **使用场景:** 默认优先、需要访问数据库、SEO 重要、无交互需求
- **特点:** 无 `'use client'` 声明

#### 客户端组件
- **使用场景:** 需要 React Hooks、事件监听、浏览器 API、第三方交互库
- **特点:** 文件顶部必须声明 `'use client'`

### 3.3 Server Actions 规范

**标准流程:**
1. 认证检查
2. 输入验证（Zod）
3. 业务逻辑
4. 缓存刷新（`revalidatePath`）
5. 返回结果

### 3.4 TypeScript 规范

- **优先使用类型推导**
- **避免使用 `any`，使用 `unknown`**
- **使用 Zod 推导类型**
- **严格空值检查**

## 4. Cursor Rules 配置（AI 辅助开发规范）

### 4.1 AI 开发流程规范

#### 思考步骤要求
- **先规划后实现**: AI 必须首先用伪代码详细描述实现计划
- **步骤确认**: 描述计划后需要用户确认再编写代码
- **渐进式开发**: 将复杂功能分解为多个可管理的步骤

#### 代码质量标准
- **完整性**: 完全实现所有请求的功能，不遗漏任何细节
- **质量保证**: 编写无 bug、安全、高性能、高效的代码
- **可读性优先**: 优先考虑代码可读性，而非过度优化性能
- **最新实践**: 使用最新的技术栈和最佳实践

### 4.2 Next.js 15 最佳实践

#### RSC（服务端组件）优先策略
```typescript
// ✅ 优先使用服务端组件
export default async function PostsPage() {
  const posts = await getPosts()
  return <PostList posts={posts} />
}

// ❌ 避免不必要的客户端组件
'use client'
export default function PostsPage() {
  const [posts, setPosts] = useState([])
  // 数据获取应该在服务端完成
}
```

#### 客户端组件最小化原则
- **仅在必要时使用**: 需要 Web API 访问、事件监听、浏览器 API
- **保持组件小巧**: 客户端组件应该尽可能小且专注
- **Suspense 包装**: 所有客户端组件都应该用 Suspense包装

#### 动态加载策略
```typescript
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
```

### 4.3 错误处理模式

#### Server Actions 错误处理
```typescript
'use server'
export async function createPost(formData: FormData) {
  // 1. 早期错误处理
  if (!formData.get('title')) {
    return { error: '标题不能为空' }
  }
  
  try {
    // 2. 业务逻辑（快乐路径）
    const post = await db.insert(posts).values({
      title: formData.get('title'),
      content: formData.get('content'),
    }).returning()
    
    revalidatePath('/posts')
    return { success: true, data: post }
  } catch (error) {
    // 3. 异常处理
    return { error: '创建失败，请重试' }
  }
}
```

### 4.4 文件组织规范

#### 标准文件结构
```typescript
// components/posts/PostCard.tsx
import React from 'react'
import type { Post } from '@/types'

// 1. 导出的主组件
export default function PostCard({ post }: { post: Post }) {
  return (
    <Card>
      <PostHeader post={post} />
      <PostContent content={post.content} />
      <PostActions postId={post.id} />
    </Card>
  )
}

// 2. 子组件
function PostHeader({ post }: { post: Post }) {
  return <header>{post.title}</header>
}

// 3. 辅助函数
function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN').format(date)
}

// 4. 静态内容
const DEFAULT_AVATAR = '/images/default-avatar.png'

// 5. 类型定义
export interface PostCardProps {
  post: Post
  className?: string
}
```

#### 命名约定
- **目录命名**: 小写连字符 (`components/auth-wizard`)
- **变量命名**: 使用辅助动词 (`isLoading`, `hasError`, `shouldShow`)
- **组件导出**: 优先使用命名导出
- **函数声明**: 使用 `function` 关键字而非 `const`

### 4.5 AI 交互指导

#### 代码生成原则
- **TypeScript 优先**: 所有代码都必须使用 TypeScript
- **函数式编程**: 优先使用函数式和声明式编程模式
- **避免类**: 不使用类，优先使用函数和对象
- **模块化**: 优先迭代和模块化，避免代码重复

#### 注释和命名规范
- **最小化注释**: 使用清晰的变量和函数名代替注释
- **描述性命名**: 函数名应该描述其功能，变量名应该描述其内容
- **一致的命名**: 在整个项目中保持命名风格一致

### 4.6 性能优化指导

#### Web Vitals 优化
- **LCP**: 优化图片和关键资源加载
- **CLS**: 为动态内容预留空间
- **FID**: 最小化 JavaScript 执行时间

#### 图片优化
```typescript
import Image from 'next/image'

export function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      format="webp"
      sizes="(max-width: 768px) 100vw, 50vw"
      loading="lazy"
      {...props}
    />
  )
}
```

#### 状态管理优化
- **URL 状态**: 使用 `nuqs` 管理搜索参数状态
- **服务端状态**: 优先在服务端处理状态，减少客户端负担
- **局部状态**: 仅在必要时使用 `useState` 和 `useEffect`

## 5. AI 功能集成模式

### 5.1 基础聊天功能
- **API:** `streamText` from `ai`
- **前端:** `useChat` from `ai/react`
- **配置:** Vercel AI SDK + OpenAI

### 5.2 AI Agent 工具调用
- **API:** `streamText` + `tool` from `ai`
- **功能:** 搜索、创建、更新等业务操作
- **集成:** 数据库操作 + AI 推理

### 5.3 结构化数据提取
- **API:** `generateObject` from `ai`
- **Schema:** Zod 定义输出结构
- **用途:** 内容分析、元数据提取

### 5.4 RAG 检索增强生成
- **嵌入:** `embed` from `ai`
- **检索:** 向量相似度搜索
- **生成:** 结合上下文的回答

## 6. 性能优化

### 6.1 图片优化
- **组件:** `next/image`
- **特性:** 懒加载、模糊占位、优先级控制

### 6.2 缓存策略
- **静态生成:** `revalidate = false`
- **ISR:** `revalidate = 60`
- **动态:** `dynamic = 'force-dynamic'`
- **按需刷新:** `revalidatePath`, `revalidateTag`

### 6.3 流式渲染
- **组件:** `Suspense`
- **用途:** 异步组件加载、提升首屏体验