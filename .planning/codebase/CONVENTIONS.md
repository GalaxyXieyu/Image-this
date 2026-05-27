# Coding Conventions

**Analysis Date:** 2026-05-26

## Naming Patterns

**Files:**
- Next.js 页面使用 `page.tsx`、`layout.tsx`、`route.ts`
- React 组件大多使用 `PascalCase.tsx`
- 业务模块和工具文件多为 `kebab-case.ts`，也存在历史混用

**Functions:**
- 普遍使用 camelCase
- 事件处理器常用 `handleXxx`
- API route 导出固定为 `GET` / `POST` / `DELETE` 等大写函数

**Variables:**
- 变量使用 camelCase
- 常量使用 `UPPER_SNAKE_CASE`
- 类私有状态不使用特殊前缀

**Types:**
- TypeScript interface / type 使用 PascalCase
- Prisma model 使用 PascalCase，数据库表用 `@@map("snake_case")`

## Code Style

**Formatting:**
- 整体倾向单引号、分号保留、2 空格缩进
- 项目未显式暴露 Prettier 配置，主要依赖既有代码风格

**Linting:**
- 使用 Next.js ESLint：`npm run lint`
- `next.config.ts` 中开启 `ignoreDuringBuilds: true`，说明构建不强卡 lint

## Import Organization

**Order:**
1. 外部依赖
2. 内部 alias（`@/`）
3. 相对路径

**Grouping:**
- 一般会按组留空行
- 未见严格自动排序约束

**Path Aliases:**
- `@/` 指向 `src/`

## Error Handling

**Patterns:**
- API 边界使用 `try/catch`，失败时返回 JSON 错误
- worker 在失败时更新数据库任务状态，而不是只抛异常
- 主进程错误倾向先写日志，再展示失败状态页

**Error Types:**
- 通常直接抛 `Error`
- Provider 错误有单独映射：`src/lib/provider-error-utils.ts`

## Logging

**Framework:**
- 主要是 `console.log`, `console.warn`, `console.error`
- Electron 主进程额外把日志同步写入文件

**Patterns:**
- 大量日志出现在任务处理和配置读取路径上
- 生产环境缺少统一 structured logging 抽象

## Comments

**When to Comment:**
- 当前仓库注释多用于解释业务原因、打包兼容性和桌面端限制
- API 和 worker 中有较多面向排障的中文注释

**TODO Comments:**
- 未见统一 TODO 规范

## Function Design

**Size:**
- 复杂页面和 worker 路由存在长函数与大 switch，说明历史上偏向直接扩展而非持续拆分

**Parameters:**
- 简单函数直接传多个参数
- 业务处理器更偏好对象参数

**Return Values:**
- API route 返回 `NextResponse.json`
- hooks / service 返回对象结构较多

## Module Design

**Exports:**
- React 组件常见 default export
- 工具与 service 更多使用 named exports

**Barrel Files:**
- 局部存在 `index.ts`，但不是强依赖模式

---
*Convention analysis: 2026-05-26*
*Update when patterns change*
