# 图片生成端到端配置清单

更新时间：2026-06-27
关联任务：T8 图片生成端到端配置清单梳理

## 目标

先把真实出图链路需要的配置一次性收齐，再继续做移动端交互、默认模板导入、测试图生成和存储验证。这样后续验证不只停在“能创建任务”，而是要走到“provider 成功生成图片、worker 保存结果、结果页能查看图片”。

## 当前链路判断

当前场景生成主要走 `BACKGROUND_REMOVAL`/背景替换任务：

1. 用户上传商品图和参考场景图，输入素材保存到本地 input-assets。
2. `/api/tasks` 创建 `TaskQueue`。
3. `/api/tasks/worker` 读取任务，根据 provider/model 调用 `processWithGPT`、`processWithGemini` 或 `processWithJimeng`。
4. 生成图片返回 base64 或 URL 后，通过 `uploadBase64Image` 保存到本地存储。
5. 创建 `ProcessedImage`，任务状态变为完成，前端轮询展示结果图。

默认结果存储是本地文件系统，不需要云存储 key。图床只在 provider 需要公网可访问输入图时才是硬依赖，尤其是火山引擎扩图/高清和即梦 Legacy 视觉 API。

## main 分支对照结论

用户已确认：不确定模型调用时，以 `main` 分支为正确基准。对照后结论如下：

1. GPT 在 `main` 的正确基准是 OpenAI-compatible 同步调用：`POST ${GPT_API_URL}/v1/images/generations`，body 使用 `model`、`prompt`、`size: "1024x1024"`、`n: 1`、`image_urls`。默认是 `https://yunwu.ai` + `gpt-4o-image-vip`。
2. 当前分支把 GPT 默认改成了 `https://toapis.com` + `gpt-image-2`，并新增了 toapis 上传图片、创建任务、轮询结果的分支。这个不是 main 基准，需要在真实 key 测试前确认接口是否确实要求 `reference_images` + 轮询；否则应回到 main 的同步 `image_urls` 调用。
3. Gemini 和 Jimeng provider 文件与 `main` 基本一致。Gemini 支持两条路：toapis-compatible 先上传再轮询；非 toapis base 走 Gemini native `generateContent`。
4. Jimeng 处理器本身在 `main` 就支持 Ark-only 和 Legacy 两种模式，但统一 service 在 `main` 和当前分支都有一个前置检查矛盾：`JIMENG` 会先被当成 `VOLCENGINE` 一起要求火山 AK/SK，导致只填 `ARK_API_KEY` 可能进不到 Ark 调用。这个不是当前分支新引入的问题，但需要修。
5. `main` 的 worker 只认 `aiModel = "gpt" | "gemini" | "jimeng"`，模型名来自用户设置。当前分支新增了具体模型选择、`provider/modelName/fallbackModels` 和 typed handler，这个产品方向可以保留，但 provider 底层调用必须按 main 的正确 API 形态校准。

## 你一次性发我这些

### A. 最小推荐配置：先跑通场景生成

推荐先选一个 provider 跑通真实生成。优先级建议：

1. GPT/OpenAI-compatible：适合先快速跑通 `/workspace/scene`，但调用方式以 `main` 的同步 `image_urls` 为基准。
2. Gemini：也适合跑通场景生成，但要确认 Base URL 是 Gemini native 还是 toapis-compatible。
3. Jimeng Ark：适合 Seedream，但 `main` 和当前分支都有 Ark-only 前置检查阻塞，需要先修一小处代码。

请按你想先验证的 provider 填至少一组。

```env
# Runtime
DATABASE_URL="file:./app.db"
NEXTAUTH_URL="http://localhost:34123"
NEXTAUTH_SECRET="请给一个至少 32 位的随机字符串"

# Provider 方案 1：GPT / OpenAI-compatible，三项都填
# main 基准默认是 https://yunwu.ai + gpt-4o-image-vip；如果你给 toapis，我会先核对它到底走同步还是异步任务接口。
GPT_API_URL="例如：https://yunwu.ai"
GPT_API_KEY="..."
GPT_MODEL_NAME="例如：gpt-4o-image-vip"

# Provider 方案 2：Gemini，三项都填
GEMINI_BASE_URL="例如：https://toapis.com 或官方 Gemini API base"
GEMINI_API_KEY="..."
GEMINI_MODEL_NAME="例如：gemini-3.1-flash-image-preview"

# Provider 方案 3：即梦 Ark，三项都填。只填这组前，需要先修 service 的 Ark-only 前置检查。
ARK_API_KEY="..."
JIMENG_BASE_URL="https://ark.cn-beijing.volces.com/api/v3/images/generations"
JIMENG_MODEL="例如：seedream-4.5 或 doubao-seedream-4-5-251128"

# Worker
MAX_CONCURRENT_TASKS="1"
```

### B. 可选增强配置

这些不是“先跑通场景生成”的最低要求，但会影响更多工具能力。

```env
# 火山引擎：高清化、扩图、旧版即梦/视觉 API
VOLCENGINE_ACCESS_KEY="..."
VOLCENGINE_SECRET_KEY="..."

# 图床：火山/旧版即梦需要公网图片 URL 时使用
SUPERBED_TOKEN="..."

# 通义千问扩图：代码里有独立 Qwen provider，但当前 service 入口仍复用 GPT 配置，需要后续梳理
QWEN_API_KEY="..."

# 内部任务恢复接口
INTERNAL_API_SECRET="..."
```

### C. 本地存储配置

不填也能跑，开发环境默认保存到：

```text
public/uploads/
public/uploads/input-assets/
```

如果你希望结果图固定保存到某个目录，请给：

```text
localStorage.savePath="/绝对路径/ImagineThis-outputs"
```

这个值目前是用户设置项，不是 `.env.example` 里的环境变量。设置页保存后会进入用户配置；Web 开发环境下自定义路径可能返回本机文件路径，后续真实线上部署前要再确认访问方式。

### D. 测试账号与测试图片

本地 UI/UX 自动化脚本默认账号：

```text
UIUX_EMAIL="test@imaginethis.local"
UIUX_PASSWORD="TestPassword123!"
```

请确认是否继续使用默认账号，或者给我一组新测试账号。

测试图片至少需要两张：

```env
UIUX_PRODUCT_IMAGE="/绝对路径/商品图.png"
UIUX_REFERENCE_IMAGE="/绝对路径/参考场景图.png"
UIUX_REQUIRE_IMAGE="true"
UIUX_TASK_TIMEOUT_MS="300000"
```

如果你不指定，脚本会用当前 repo 里的品牌图做占位素材，但真实生成效果不一定能代表电商商品。

### E. 旧模板/默认模板来源

当前有两类模板：

1. `/templates` 页面使用代码内置的 `src/lib/workbench/presets.ts`，包含上架图、白底图、场景图、海报、短视频、图片处理和组合模板。
2. `/api/prompt-templates` 使用数据库 `PromptTemplate`，首次请求且用户没有模板时会创建默认提示词模板：背景替换、扩图、一键增强。

如果你说的“以前的默认模板”在别的项目、旧数据库或旧文档里，请给我来源之一：

```text
旧模板 JSON/CSV/Markdown 路径：
旧数据库路径：
旧项目目录：
希望导入的分类：场景图 / 白底图 / 上架图 / 提示词模板 / 组合工作流
```

后续我建议做成一个可重复执行的 seed/import 脚本，避免只在某个用户第一次打开接口时临时创建。

## 设置页等价字段

如果不想改 `.env`，也可以在 `/settings` 配：

| 设置区 | 字段 | 对应配置 |
| --- | --- | --- |
| GPT | API URL | `GPT_API_URL` / `gpt.apiUrl` |
| GPT | API Key | `GPT_API_KEY` / `gpt.apiKey` |
| GPT | 模型名/启用模型 | `GPT_MODEL_NAME` / `gpt.modelName` / `gpt.models` |
| Gemini | Base URL | `GEMINI_BASE_URL` / `gemini.baseUrl` |
| Gemini | API Key | `GEMINI_API_KEY` / `gemini.apiKey` |
| Gemini | 模型名/启用模型 | `GEMINI_MODEL_NAME` / `gemini.modelName` / `gemini.models` |
| 即梦 | Ark API Key | `ARK_API_KEY` / `jimeng.arkApiKey` |
| 即梦 | Base URL | `JIMENG_BASE_URL` / `jimeng.baseUrl` |
| 即梦 | 模型名/启用模型 | `JIMENG_MODEL` / `jimeng.modelName` / `jimeng.models` |
| 火山引擎 | Access Key / Secret Key | `VOLCENGINE_ACCESS_KEY` / `VOLCENGINE_SECRET_KEY` |
| 图床 | Superbed Token | `SUPERBED_TOKEN` / `imagehosting.superbedToken` |
| 本地存储 | 保存路径 | `localStorage.savePath` |
| 任务运行 | 并发数 | `MAX_CONCURRENT_TASKS` / `taskRuntime.concurrency` |

配置读取优先级：桌面密钥库 / 数据库用户设置优先，`.env` 是兜底。开发阶段为了省步骤，可以先用 `.env` 跑通；之后再通过设置页验证用户级配置。

## 已发现的配置风险

1. GPT 默认值和调用方式被当前分支改动：`main` 是 `https://yunwu.ai` + `gpt-4o-image-vip` + 同步 `image_urls`；当前分支部分默认变成 `https://toapis.com` + `gpt-image-2`，并新增 toapis 上传/轮询。需要以 `main` 为基准修正或按你给的 provider 文档单独适配。
2. Jimeng Ark-only 被 service 前置检查挡住：`JimengProcessor` 支持只填 `ARK_API_KEY`，但 `initializeProvider` 现在会先对 `JIMENG` 执行火山 AK/SK 检查。这个问题 `main` 也存在。若我们先用 Ark 跑通，需要先修这个逻辑。
3. Qwen 配置路径不一致：`QWEN_API_KEY` 在 env 和独立 provider 里存在，但统一 service 里 Qwen 仍使用 GPT 配置。先不要把 Qwen 作为主链路验证 provider。
4. Superbed 不应该是所有出图的必填项：GPT/Gemini/toapis/Ark 返回图片后可直接本地保存；只有火山/Legacy 需要公网输入图时才必须配置。
5. 本地 DB schema 之前出现过 `users.gptModelsJson` 缺失的现象。真实测试前需要确认 Prisma schema 与 SQLite 已同步，但不要在没有确认数据备份前随意跑破坏性数据库操作。
6. provider key 不要写进计划文档、git 提交或 PM 评论。清单只记录变量名和占位符。

## 我拿到配置后的验证路径

1. 写入 `.env` 或通过设置页保存用户级配置。
2. 确认数据库 schema 可用，必要时先备份本地 SQLite，再执行安全同步。
3. 启动 `npm run dev`，登录测试账号。
4. 运行 UI/UX 真实生成脚本，要求 `UIUX_REQUIRE_IMAGE=true`。
5. 验证：
   - 商品图和参考图上传成功。
   - 任务创建成功并进入 worker。
   - provider 返回图片。
   - `public/uploads` 或自定义目录出现结果图。
   - `ProcessedImage` 有记录。
   - 页面显示最终结果图。
6. 把旧模板/default presets 做成导入脚本或初始化入口，再复跑生成验证。

## 建议的下一步开发顺序

1. 先按 main 校准 GPT 调用方式，并修 Jimeng Ark-only 前置检查。
2. 加一个设置页/诊断页的“连接测试/模型列表测试/最小出图测试”。
3. 做默认模板/旧模板 seed-import，区分 workbench presets 和 DB prompt templates。
4. 把移动端生成页按 T7 方案重排：上传放上面，基础信息少填，高级设置折叠，枚举选项横向 pill。
5. 用真实 provider + 测试图片跑一遍登录到出图的自动化验证。
