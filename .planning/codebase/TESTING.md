# Testing Patterns

**Analysis Date:** 2026-05-26

## Test Framework

**Runner:**
- Playwright 已安装，但当前仓库未形成固定 E2E 套件目录
- 零散脚本测试存在，如 `scripts/test-video-api.ts`

**Assertion Library:**
- 当前无统一测试断言框架落地证据

**Run Commands:**
```bash
npm run lint                              # 当前最稳定的静态检查入口
node scripts/verify-build.js              # 验证 Windows 打包产物
node scripts/test-video-api.ts            # 零散接口测试脚本
```

## Test File Organization

**Location:**
- 没有标准 `tests/` 或 `__tests__/` 结构
- 现有验证主要混在 `scripts/` 里

**Naming:**
- 偏脚本命名，不是标准单元测试命名

## Test Structure

**Suite Organization:**
- 当前更像人工验证脚本与构建后检查，而不是系统化测试金字塔

**Patterns:**
- 构建验证：检查打包产物目录、关键文件存在
- 功能验证：通过页面轮询、日志和脚本手工确认

## Mocking

**Framework:**
- 未见统一 mocking 方案

**What to Mock:**
- 后续若补测试，外部 AI provider、文件系统写入、Prisma 查询都应优先 mock 或替换为测试隔离层

## Fixtures and Factories

**Test Data:**
- 当前未见明确 fixture/factory 层

## Coverage

**Requirements:**
- 当前没有覆盖率门槛

**Configuration:**
- 无显式 coverage 配置

## Test Types

**Unit Tests:**
- 当前缺失，是明显测试债务

**Integration Tests:**
- worker、task route、storage、desktop runtime 这类高风险路径缺少集成测试

**E2E Tests:**
- Playwright 依赖已安装，但桌面端与关键用户流程尚未沉淀成固定套件

## Common Patterns

**Build Verification:**
- `scripts/verify-build.js` 用于检查 Windows 打包后的 runtime 文件完整性

**Manual Runtime Verification:**
- 通过 Electron 启动日志、`/api/health`、任务队列页面和历史页观察结果

## Test Gaps

- `/api/tasks` 与 `/api/tasks/worker` 的负载、返回体积和状态推进没有自动化验证
- Electron 主进程启动、子进程恢复、窗口关闭后的任务连续性没有回归测试
- Windows 专项性能优化缺少基线测试和指标采集脚本

---
*Testing analysis: 2026-05-26*
*Update when test patterns change*
