# Image This

## What This Is

Image This 是一个面向桌面端使用场景的 AI 图像处理应用，当前以 Next.js + Electron 形态运行，支持背景替换、扩图、高清化、水印和视频生成。它的核心用户是需要在本地桌面环境里批量处理图片、配置多个 AI 提供商并保存结果的业务用户，而不是纯 Web SaaS 浏览器用户。

## Core Value

桌面端任务必须稳定入队、持续后台处理，并在 Windows 上保持可接受的启动与接口响应速度。

## Requirements

### Validated

- ✓ 桌面端 Electron 外壳可启动内嵌 Next.js 服务并加载工作区界面
- ✓ 用户可以创建图片处理任务并在历史/任务中心查看状态
- ✓ 应用支持多模型配置与本地文件保存

### Active

- [ ] 后台任务处理必须脱离“靠前端触发 worker”的模式，形成稳定常驻运行链路
- [ ] Windows 版接口和任务相关页面需要明显降低响应延迟与卡顿
- [ ] 任务状态查询链路需要瘦身，避免大 JSON/base64 反复穿透数据库和接口
- [ ] 桌面端数据库和文件 IO 需要按 Windows 本地运行特性做专项调优
- [ ] worker 执行失败、重试失败、触发失败都必须能明确反馈到前端界面
- [ ] Windows 安装、重装和自动更新不能破坏已存在的本地数据库和用户配置
- [ ] 下一阶段将任务输入从 base64 传输迁移到本地资产引用，进一步降低队列和接口负载

### Out of Scope

- 浏览器部署形态的全面性能优化 — 当前用户痛点集中在桌面端，优先级明显更低
- 新增更多 AI 能力或新模型接入 — 在后台稳定性和性能问题解决前会继续放大复杂度
- 大规模 UI 改版 — 当前问题不在视觉层，先保留现有交互路径

## Context

这是一个 brownfield 项目，仓库内已经包含 Electron 主进程、Next.js App Router、Prisma + SQLite、本地文件存储以及 Windows 打包脚本。当前没有现成的 `.planning` 工件，说明历史分析和治理没有沉淀成 GSD 可持续消费的状态。

这次代码阅读确认了两个核心事实。第一，桌面端后台任务处理依赖 API 路由 `/api/tasks/worker` 被前端或启动恢复逻辑触发，不是独立常驻 worker。第二，任务表和任务接口承载了过多大字段，尤其是 `inputData`/`outputData` 中的 JSON 与 base64 内容，这与 Windows 上的 SQLite、本地文件系统和 Defender 扫描一起，形成了明显的性能放大效应。

## Constraints

- **Tech stack**: 需要保持 Next.js 15 + Electron 39 + Prisma + SQLite 现有栈 — 避免在治理性能前引入新架构迁移风险
- **Compatibility**: 未经验证不能破坏现有任务 API、桌面启动链路和 Windows 打包流程 — 这些已被当前用户依赖
- **Performance**: 优化重点必须先落在 Windows 桌面端启动、轮询、队列处理和本地 IO — 这是当前主要痛点
- **Scope control**: 本轮优先做结构性治理，不顺手扩展新能力 — 防止任务继续失焦

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 先建立 `.planning` 再做优化 | 当前仓库没有 GSD 工件，后续分析和执行无法连续复用 | ✓ Good |
| 性能治理优先围绕桌面端 runtime、任务队列、SQLite、Windows IO | 代码证据表明慢点集中在这条链路，而不是单个组件渲染 | ✓ Good |
| 把“后台运行稳定性”和“任务接口瘦身”作为第一阶段 | 这是后续所有性能优化的基础，不先处理会继续被架构反噬 | ✓ Good |
| Windows 安装/更新的数据安全视为 P0 风险 | 当前 NSIS 安装脚本会主动清理用户目录，实际存在数据库被删风险 | ✓ Good |

---
*Last updated: 2026-05-26 after brownfield runtime and performance analysis*
