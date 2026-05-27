# Phase 1 Windows Regression Plan

**Phase:** `01-desktop-runtime-performance`  
**Prepared:** 2026-05-26  
**Platform required:** Windows 10/11 physical machine or stable VM  
**Purpose:** 验证桌面端后台 worker、失败提示、安装更新保数据这三类高风险链路

## 1. Mac 上已确认 / 未确认边界

### 已在 Mac 上静态确认

- 用户数据库路径位于 `app.getPath('userData')/data/app.db`，不在安装目录内  
  参考：`electron/app-runtime.js`
- 桌面启动时如果数据库存在，会先做备份再迁移  
  参考：`electron/database-manager.js`
- NSIS 安装脚本已改为默认保留用户数据，不再主动删除 `APPDATA/LOCALAPPDATA/PROFILE/ImagineThis`  
  参考：`build/installer.nsh`
- 前端已补 worker 触发失败提示与全局失败计数提醒  
  参考：`src/hooks/useImageProcessing.ts`, `src/app/workspace/page.tsx`, `src/app/history/page.tsx`, `src/components/navigation/TaskStatsPopover.tsx`

### 必须在 Windows 实机验证

- NSIS 安装版升级是否真的保留 `userData`
- electron-updater 自动更新安装后是否保留数据库和配置
- Windows 上后台任务失败是否能稳定给到用户可见提示
- 窗口关闭/重开、应用重启后任务恢复和队列消费是否连续
- Windows Defender / 文件锁 / SQLite 本地文件行为是否引入额外问题

## 2. 测试前准备

### 安装包准备

- 旧版本安装包：一个已知可运行的历史 Windows 安装包
- 新版本安装包：包含本次修复的安装包
- 如果要测自动更新：
  - 可用的 `latest.yml`
  - 新版本的 `Setup.exe`
  - 对应更新源 URL 可访问

### 机器准备

- 一台干净 Windows 机器，推荐本地管理员权限
- 关闭不必要的第三方清理工具，避免误删 `AppData`
- 记录以下目录：
  - `%APPDATA%`
  - `%LOCALAPPDATA%`
  - Electron `userData` 实际路径

### 取证要求

每个用例至少保留以下证据之一：

- 截图
- 屏幕录像
- `~/ImagineThis/logs` 等价 Windows 日志目录导出
- `userData/data/app.db` 文件时间戳和大小

## 3. 需要观察的关键路径

### 数据目录

先在应用内完成一次登录、保存配置、跑 1 个任务，然后确认：

- `userData/data/app.db` 存在
- `userData/data/backups/` 存在或后续升级时出现
- `userData/config/` 存在

记录：

- `app.db` 文件大小
- `app.db` 最后修改时间
- 配置目录中文件列表

## 4. 测试用例

### Case 1: 首次安装不影响本地数据库创建

**目标**  
验证全新安装后数据库正常初始化。

**步骤**
1. 在干净 Windows 机器安装新版本安装包
2. 启动应用
3. 完成登录
4. 进入设置页保存一组明显可辨认的配置值
5. 运行 1 个简单任务
6. 关闭应用

**预期**
- 应用可正常启动
- 能成功创建任务
- `userData/data/app.db` 存在
- 配置和任务记录可在重开后继续看到

**失败信号**
- 应用首次启动报数据库错误
- 任务无法创建
- 重开后配置丢失

---

### Case 2: 覆盖安装保留数据库和配置

**目标**  
验证重新安装新版本不会清空老数据。

**步骤**
1. 先完成 Case 1，确保已有登录、配置、至少 1 条历史任务
2. 不手动删除旧版本，直接运行新版本安装包覆盖安装
3. 安装完成后启动应用
4. 检查登录状态、设置页、历史页、任务中心
5. 对比 `app.db` 文件是否仍存在，且不是一个全新空库

**预期**
- 不要求重新登录，或即便需要重新登录，历史数据仍保留
- 设置页中的配置值仍在
- 历史任务仍在
- `app.db` 文件路径不变，内容未被清空

**失败信号**
- 历史页为空
- 配置被重置
- `app.db` 被重建成全新小文件

---

### Case 3: 卸载应用不默认删除用户数据

**目标**  
验证卸载不默认删库。

**步骤**
1. 完成 Case 1，确保已有数据
2. 通过 Windows 卸载流程卸载应用
3. 不清理任何 AppData 目录
4. 检查 `userData/data/app.db` 和 `userData/config/`

**预期**
- 卸载后应用程序文件可移除
- 用户数据目录仍存在
- `app.db` 仍存在

**失败信号**
- 卸载后 `userData` 被清空

---

### Case 4: 重装后读取原数据库

**目标**  
验证卸载后重装还能读回原来的数据库。

**步骤**
1. 基于 Case 3 的机器状态重新安装新版本
2. 启动应用
3. 进入历史页和设置页

**预期**
- 历史任务仍在
- 设置值仍在
- 不出现“数据库损坏/表不存在”的错误

**失败信号**
- 重新安装后像全新应用
- 数据库恢复失败

---

### Case 5: worker 触发失败前端必须有提示

**目标**  
验证 `worker` 无法启动时用户能看到清晰提示。

**建议构造方式**
- 临时让 `/api/tasks/worker` 返回 500
- 或让本地服务端口冲突 / 子进程异常，确保 POST 失败

**步骤**
1. 打开工作区
2. 提交图片任务
3. 让 `POST /api/tasks/worker` 失败
4. 观察工作区页面 toast
5. 在任务中心页面手动点“触发任务处理器”或等价入口，再观察 toast

**预期**
- 工作区会提示“任务已入队，但后台处理器启动失败”
- 任务中心会提示“后台处理器启动失败”
- 用户知道任务已创建，但处理器没有正常跑起来

**失败信号**
- 页面无任何提示，只能看控制台或日志

---

### Case 6: 后台任务最终失败时有可见提醒

**目标**  
验证后台失败不是静默发生。

**建议构造方式**
- 填入无效 provider 配置
- 提交必然失败的任务

**步骤**
1. 确保应用顶部任务统计组件可见
2. 提交一个会失败的任务
3. 等待任务最终进入 `FAILED`
4. 观察顶部统计组件是否弹出失败提醒
5. 打开任务中心，确认失败任务可见并带错误信息

**预期**
- 失败数增加时会有全局提醒
- 任务中心能看到失败任务
- 错误文案能帮助用户判断是 provider 失败还是 worker 失败

**失败信号**
- 失败任务只体现在计数变化，没有提示
- 用户必须自己刷新历史页才知道失败

---

### Case 7: 应用重启后卡住任务能恢复

**目标**  
验证 `PROCESSING` 状态任务在异常退出后能被恢复处理或明确标失败。

**步骤**
1. 提交一个耗时长的任务
2. 在任务处理中强制关闭应用
3. 重启应用
4. 等待恢复逻辑执行
5. 观察任务最终变成 `PENDING` 继续跑，或达到最大重试后转 `FAILED`

**预期**
- 不会永久卡在 `PROCESSING`
- 恢复或失败路径有可见日志 / UI 结果

**失败信号**
- 任务永久卡住
- 用户看不到任何恢复或失败信息

---

### Case 8: 自动更新安装后保留数据库

**目标**  
验证 `electron-updater` 路径不会破坏数据库。

**步骤**
1. 先安装旧版本安装版
2. 产生真实数据：登录、保存配置、跑任务
3. 配置更新源，让应用检测到新版本
4. 等待下载完成，点击“重启安装”
5. 更新后重新启动应用
6. 检查设置、历史、数据库文件

**预期**
- 更新后应用版本升级成功
- 原历史任务仍在
- 原配置仍在
- `app.db` 未被替换为空库

**失败信号**
- 升级后数据全丢
- 版本升级成功但配置/历史被重置

## 5. 通过标准

### P0 必须通过

- Case 2 覆盖安装保留数据库
- Case 5 worker 启动失败前端可见
- Case 6 任务最终失败全局可见
- Case 8 自动更新保留数据库

### P1 应通过

- Case 3 卸载默认不删数据
- Case 4 重装能读回旧数据
- Case 7 重启后卡住任务可恢复或明确失败

## 6. 建议测试节奏

### 上午：数据安全链路

1. Case 1
2. Case 2
3. Case 3
4. Case 4

### 下午：worker 与失败提示链路

1. Case 5
2. Case 6
3. Case 7
4. Case 8

## 7. 执行后回填建议

Windows 实测结束后，把结果写回：

- `.planning/phases/01-desktop-runtime-performance/01-UAT.md`

每个失败项至少补：

- 复现步骤
- 截图或日志路径
- 严重级别：`blocker | major | minor`
- 是否需要新增 gap-fix plan

---

**Status:** Ready for Windows execution  
**Blocked by:** Windows machine availability  
**Owner for execution:** User + Codex pairing on Windows session
