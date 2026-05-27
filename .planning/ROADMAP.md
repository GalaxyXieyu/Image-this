# Roadmap: Image This

## Overview

当前版本已经具备桌面端 AI 图像处理的主要业务能力，但运行时架构和任务链路开始成为明显瓶颈。第一阶段不扩功能，集中修复后台运行稳定性、Windows 接口慢和任务队列负载过重的问题，为后续继续迭代模型能力和桌面体验打基础。

## Phases

- [ ] **Phase 1: Desktop Runtime & Performance** - 稳定桌面端后台任务链路并完成 Windows 性能治理
- [ ] **Phase 2: Task Input Asset References** - 把任务输入从 base64 JSON 迁移为本地资产引用
- [ ] **Phase 3: App Log Observability** - 在应用内查看、定位和配置桌面日志，降低 Windows 排障成本

## Phase Details

### Phase 1: Desktop Runtime & Performance
**Goal**: 把桌面端运行时从“前端触发式任务处理”收敛为稳定的后台处理体系，并显著降低 Windows 版接口与任务相关页面的延迟
**Depends on**: Nothing (first phase)
**Requirements**: [PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06]
**Success Criteria** (what must be TRUE):
  1. 用户关闭或切换主界面后，任务队列仍能被稳定消费，不依赖页面触发 `/api/tasks/worker`
  2. 任务轮询接口不再返回大体积 `inputData/outputData`，状态查询链路只承载轻量字段
  3. Windows 版启动后访问健康检查、任务状态和最近任务列表的体感明显改善，并有代码层面的 IO / DB 调优落地
  4. worker 失败、重试失败和触发失败都能在前端可见，不再只留在日志里
  5. Windows 安装、重装和自动更新不会删除既有数据库、配置和历史任务
  6. Phase 内每个 plan 都有明确验证方式，后续可以直接进入 execute
**Plans**: 3 plans

Plans:
- [x] 01-01: 常驻后台 worker、失败上报与桌面 runtime 稳定性改造
- [x] 01-02: 任务接口瘦身与轮询链路降载
- [x] 01-03: SQLite、文件 IO、安装更新数据安全与 Windows 专项性能调优

Manual verification artifacts:
- `01-WINDOWS-REGRESSION.md` - Windows 实机专项回归步骤
- `01-UAT.md` - 当前阻塞中的 Windows UAT 跟踪文件

### Phase 2: Task Input Asset References
**Goal**: 把任务输入从前端直接传 base64 的模式迁移为“输入资产先落地，任务只传引用”，降低前端、接口、队列和 SQLite 负载
**Depends on**: Phase 1
**Requirements**: [ASSET-01, ASSET-02, ASSET-03, ASSET-04, ASSET-05, ASSET-06]
**Success Criteria** (what must be TRUE):
  1. 前端创建任务时不再直接把原图/参考图的大 base64 塞进 `task_queue.inputData`
  2. worker 可以从输入资产引用读取文件，并只在 provider 边界按需转 base64
  3. 重试、恢复和历史页在迁移期兼容新旧任务模型
  4. 新任务的请求体和队列 payload 明显变轻
**Plans**: 3 plans

Plans:
- [x] 02-01: 输入资产落地与引用协议
- [x] 02-02: 前端任务创建链路引用化
- [x] 02-03: worker 输入消费与迁移兼容

### Phase 3: App Log Observability
**Goal**: 让用户不需要手动打开日志目录，也能在应用内查看 app/error 日志、打开目录、配置日志目录并快速定位后台/更新/启动问题
**Depends on**: Phase 1
**Requirements**: [LOG-01, LOG-02, LOG-03, LOG-04, LOG-05]
**Success Criteria** (what must be TRUE):
  1. 设置页能展示当前日志目录和日志文件列表
  2. 用户能在应用内读取最近 app/error 日志内容，且不会一次性加载大文件
  3. 用户能一键打开日志目录
  4. 用户能选择自定义日志目录，切换后新日志写入新目录
  5. 日志目录配置不会影响数据库、历史任务和安装更新保库策略
**Plans**: 1 plan

Plans:
- [ ] 03-01: 应用内日志查看器与日志目录配置

## Progress

**Execution Order:**
Phases execute in numeric order: 1

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Desktop Runtime & Performance | 3/3 | In progress (awaiting Windows verification) | - |
| 2. Task Input Asset References | 3/3 | Complete (code) | - |
| 3. App Log Observability | 0/1 | Planned | - |
