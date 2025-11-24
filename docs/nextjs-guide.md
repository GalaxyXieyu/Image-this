# Next.js 15 全栈开发指南

> 基于 Next.js 15 + TypeScript 5 + AI 集成的现代化全栈应用架构

## 快速开始

### 环境要求
- Node.js 20.x LTS
- pnpm 9.x
- PostgreSQL（可选）
- AI API Key（可选）

### 初始化项目
```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
pnpm install
```

### 核心依赖
```bash
# 数据层
pnpm add drizzle-orm postgres zod
pnpm add -D drizzle-kit

# 认证
pnpm add next-auth@beta @auth/drizzle-adapter

# AI 集成
pnpm add ai @ai-sdk/openai

# 状态管理
pnpm add zustand

# UI 组件
npx shadcn-ui@latest init
```

---

## 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 15.x | 全栈框架（App Router） |
| TypeScript | 5.x | 类型安全 |
| Tailwind CSS | 3.x | 样式方案 |
| Drizzle ORM | latest | 数据库 ORM |

### UI 组件库
- **Shadcn/ui** - 基础组件（源码可见，AI 友好）
- **Framer Motion** - 动画库
- **Radix UI** - 无头组件（Shadcn 底层）

### AI 工具链
- **Vercel AI SDK** - 聊天、流式响应、Tool Calling
- **LangGraph.js** - 复杂 AI 工作流编排
- **CopilotKit** - 应用内 AI 助手

---

## 项目架构

### 目录结构
```
my-project/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 路由组：认证
│   ├── (dashboard)/       # 路由组：控制台
│   ├── api/               # API 路由
│   └── layout.tsx         # 根布局
│
├── components/
│   ├── ui/                # Shadcn 基础组件
│   └── [feature]/         # 功能组件
│
├── lib/
│   ├── db/                # 数据库配置
│   ├── auth.ts            # Auth.js 配置
│   ├── ai.ts              # AI SDK 配置
│   └── utils.ts           # 工具函数
│
├── features/              # 业务功能模块
│   └── [feature-name]/
│       ├── components/    # 功能专属组件
│       ├── lib/
│       │   ├── server/    # Server Actions
│       │   ├── schemas/   # Zod Schema
│       │   └── hooks/     # React Hooks
│       └── types/         # TypeScript 类型
│
├── stores/                # Zustand 状态
├── config/                # 配置文件
└── types/                 # 全局类型
```

### Feature 模块设计
每个功能模块独立包含：
- **components/** - UI 组件
- **lib/server/** - Server Actions
- **lib/schemas/** - 数据验证
- **lib/hooks/** - React Hooks
- **types/** - TypeScript 类型

**优势：** 高内聚、易协作、可独立提取

---

## 开发规范

### 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `PostCard`, `UserProfile` |
| 文件 | kebab-case | `post-card.tsx`, `use-auth.ts` |
| 函数 | camelCase | `getUserById`, `handleSubmit` |
| 常量 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_URL` |
| 类型 | PascalCase | `User`, `PostInput` |

### Server Actions 命名
- **创建:** `create[Entity]`
- **更新:** `update[Entity]`
- **删除:** `delete[Entity]`
- **查询:** `get[Entity]` / `get[Entity]List`
- **复杂操作:** 动词 + 名词（如 `publishPost`）

### 数据库 Schema 规范
- **表名:** 复数形式（`users`, `posts`）
- **主键:** `id` (UUID)
- **时间戳:** `created_at` / `updated_at`
- **外键:** `[entity]_id`
- **字段:** camelCase

---

## Next.js 15 最佳实践

### RSC 优先策略
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

### 客户端组件使用场景
仅在以下情况使用 `'use client'`：
- 需要 React Hooks（`useState`, `useEffect`）
- 事件监听（`onClick`, `onChange`）
- 浏览器 API（`localStorage`, `window`）
- 第三方交互库

### 动态加载
```typescript
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
```

### Server Actions 标准流程
```typescript
'use server'

export async function createPost(formData: FormData) {
  // 1. 认证检查
  const session = await auth()
  if (!session) throw new Error('未授权')
  
  // 2. 输入验证
  const schema = z.object({
    title: z.string().min(1),
    content: z.string()
  })
  const data = schema.parse({
    title: formData.get('title'),
    content: formData.get('content')
  })
  
  // 3. 业务逻辑
  const post = await db.insert(posts).values(data).returning()
  
  // 4. 缓存刷新
  revalidatePath('/posts')
  
  // 5. 返回结果
  return { success: true, data: post }
}
```

---

## AI 功能集成

### 基础聊天
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  })
  
  return result.toDataStreamResponse()
}

// 前端使用
import { useChat } from 'ai/react'

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat()
  // ... 渲染聊天界面
}
```

### Tool Calling
```typescript
import { tool } from 'ai'
import { z } from 'zod'

const result = await streamText({
  model: openai('gpt-4-turbo'),
  messages,
  tools: {
    searchPosts: tool({
      description: '搜索文章',
      parameters: z.object({
        query: z.string()
      }),
      execute: async ({ query }) => {
        return await db.query.posts.findMany({
          where: like(posts.title, `%${query}%`)
        })
      }
    })
  }
})
```

### 结构化输出
```typescript
import { generateObject } from 'ai'

const result = await generateObject({
  model: openai('gpt-4-turbo'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string())
  }),
  prompt: '分析这篇文章...'
})
```

---

## Shadcn/ui 组件库

### 核心理念
- **源码可见** - 组件直接复制到项目中
- **完全可定制** - 可直接修改组件源码
- **AI 友好** - AI 可直接读取和理解组件代码

### 安装组件
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
```

### 多组件库支持
在 `components.json` 中配置：
```json
{
  "registries": {
    "@shadcn": "https://ui.shadcn.com/r",
    "@aceternity": "https://ui.aceternity.com/registry",
    "@jollyui": "https://www.jollyui.dev/r",
    "@diceui": "https://www.diceui.com/r"
  }
}
```

| 组件库 | 特点 | 适用场景 |
|--------|------|----------|
| Shadcn UI | 官方，最稳定 | 基础 UI 组件 |
| Aceternity UI | 动画丰富 | 现代化动感界面 |
| JollyUI | 可访问性强 | 无障碍支持 |
| Dice UI | 简洁实用 | 快速开发 |

---

## 性能优化

### 图片优化
```typescript
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // 首屏图片
  placeholder="blur" // 模糊占位
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 缓存策略
```typescript
// 静态生成
export const revalidate = false

// ISR（增量静态再生成）
export const revalidate = 60 // 60秒

// 动态渲染
export const dynamic = 'force-dynamic'

// 按需刷新
revalidatePath('/posts')
revalidateTag('posts')
```

### 流式渲染
```typescript
import { Suspense } from 'react'

export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts />
      </Suspense>
    </div>
  )
}
```

---

## 环境变量

### 必需变量
```bash
# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# 认证
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-min-32-chars"

# OAuth Providers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# AI API Keys
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

### 环境变量验证
```typescript
// config/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  OPENAI_API_KEY: z.string().startsWith('sk-')
})

export const env = envSchema.parse(process.env)
```

---

## TypeScript 最佳实践

### 类型安全
```typescript
// ✅ 使用 Zod 推导类型
const userSchema = z.object({
  name: z.string(),
  email: z.string().email()
})
type User = z.infer<typeof userSchema>

// ✅ 优先类型推导
const posts = await getPosts() // 自动推导类型

// ❌ 避免 any
const data: any = await fetch() // 不推荐

// ✅ 使用 unknown
const data: unknown = await fetch()
if (isPost(data)) {
  // 类型守卫后使用
}
```

### 严格模式
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

---

## 测试

### Playwright E2E 测试
```bash
pnpm add -D @playwright/test
npx playwright install
```

```typescript
// e2e/posts.spec.ts
import { test, expect } from '@playwright/test'

test('创建文章', async ({ page }) => {
  await page.goto('/posts/new')
  await page.fill('[name="title"]', '测试文章')
  await page.fill('[name="content"]', '测试内容')
  await page.click('button[type="submit"]')
  
  await expect(page).toHaveURL(/\/posts\/\d+/)
  await expect(page.locator('h1')).toContainText('测试文章')
})
```

---

## AI 辅助开发规范

### 代码生成原则
- **TypeScript 优先** - 所有代码必须使用 TypeScript
- **函数式编程** - 优先使用函数式和声明式模式
- **避免类** - 使用函数和对象，不使用类
- **模块化** - 避免代码重复，优先模块化

### 文件组织
```typescript
// 标准文件结构
import React from 'react'
import type { Post } from '@/types'

// 1. 主组件（默认导出）
export default function PostCard({ post }: { post: Post }) {
  return <Card>...</Card>
}

// 2. 子组件
function PostHeader({ post }: { post: Post }) {
  return <header>{post.title}</header>
}

// 3. 辅助函数
function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN').format(date)
}

// 4. 常量
const DEFAULT_AVATAR = '/images/default-avatar.png'

// 5. 类型定义
export interface PostCardProps {
  post: Post
  className?: string
}
```

### 命名约定
- **布尔值:** 使用辅助动词（`isLoading`, `hasError`, `shouldShow`）
- **函数:** 使用 `function` 关键字而非 `const`
- **组件:** 优先使用命名导出
- **目录:** 小写连字符（`auth-wizard`）

---

## 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm tsc --noEmit

# 数据库迁移
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 测试
pnpm playwright test
pnpm playwright test --ui

# 添加 Shadcn 组件
npx shadcn-ui@latest add [component-name]
```

---

**版本:** 2.0 | **更新日期:** 2025-11-23
