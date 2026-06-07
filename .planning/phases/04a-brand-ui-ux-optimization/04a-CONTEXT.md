# Phase 04a Context: Brand UI/UX Optimization

**Created:** 2026-06-06  
**Status:** Ready for planning/execution  
**Depends on:** Updated `docs/brand-ui-spec.md`  
**Related mainline:** Phase 4 — Unified Smart Toolbox

## Why this phase exists

品牌视觉规范之前没有把 Logo、IP、颜色、渐变和页面组合写成可执行约束。结果是品牌色、产品 UI token、截图里的色板形成了三套逻辑：

```text
展示色板偏多色活泼
产品 token 偏蓝紫 SaaS
Logo 资产实际偏深色单色
```

这会直接影响 `/workspace/scene`、`/tools`、`/tasks`、`/results` 这些核心工作台页面的观感一致性。

## New canonical design baseline

```text
专业电商工作台 × 蓝紫 AI 光感 × 克制 IP 陪伴
```

Canonical references:

- `docs/brand-ui-spec.md`
- `.planning/UI-REVIEW.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/04-unified-smart-toolbox/04-01-PLAN.md`

## Decisions

| Decision | Result |
|---|---|
| 主色收敛到蓝色 | `#2563FF` 作为 CTA、链接、选中态、进度主色 |
| AI 延展使用紫色 | `#7C3AED` 只表达 AI、生成、模板、智能能力 |
| 粉橙降级为强调色 | 只用于活动、促销、转化提醒，不做默认主按钮 |
| Logo 保持单色逻辑 | 不把 Logo 本体改成渐变，不加厚重阴影 |
| LUMO 限制使用场景 | 欢迎、引导、空状态、加载；不进入核心编辑画布 |
| GPT 插图能力进入资产候选流程 | 参考 `docs/brands/icon/cut/ip2-trimmed-preview.png` 生成首页、空状态、新手引导候选稿 |
| 浅色模式作为默认工作台 | 深色只用于用户选择或品牌演示场景 |

## Phase boundary

This phase is a UI/UX alignment pass. It should not change core backend contracts.

In scope:

- UI token alignment
- Logo and brand asset usage rules
- Button/card/tag/progress/status state cleanup
- Page-level visual hierarchy cleanup
- High-frequency pages first: `/workspace/scene`, `/tools`, `/tasks`
- Brand-compliant screenshot review after changes

Out of scope:

- Worker refactor
- Provider logic changes
- Prisma schema changes unless a UI setting truly requires it
- Old frontend deletion
- New AI provider/model integration
- Full Electron/Windows packaging regression

## Priority pages

| Priority | Page | Reason |
|---|---|---|
| P0 | `/workspace/scene` | 主工作流，直接影响用户对产品专业度的判断 |
| P0 | `/tools` | 当前 Phase 4 主线页面，需要和新规范同步 |
| P0 | `/tasks` | 状态语义必须清楚，不能被品牌装饰干扰 |
| P1 | `/results` | 结果资产墙应图片优先，减少 UI 干扰 |
| P1 | `/templates` | 模板预览和选中态需要统一 |
| P1 | `/settings` | 凭据/运行时设置需要稳定可信 |
| P2 | `/` | 首页可更品牌化，但要避免多色堆叠 |
| P2 | `/combo` | 后续按流程主线优化 |

## Risks

- 如果直接按色板截图实现，会导致页面过度彩色、偏低龄。
- 如果继续沿用旧 token，会出现 CTA、AI 强调、状态色互相抢焦点。
- LUMO 如果进入编辑画布，会干扰用户判断商品图质量。
- 过度追求品牌感会削弱工作台效率。

## Success criteria

1. 所有高频工作台页面使用同一套主色/AI 色/状态色语义。
2. `/workspace/scene` 和 `/tools` 的主操作路径比装饰更明显。
3. `/tasks` 状态色只表达状态，不表达品牌装饰。
4. `/results` 图片资产优先，操作 UI 后置。
5. Logo 和 LUMO 使用符合 `docs/brand-ui-spec.md`。
6. 截图审查不再出现明显多色漂移。
7. 不破坏当前 Phase 4 任务链路和 typed adapter 边界。