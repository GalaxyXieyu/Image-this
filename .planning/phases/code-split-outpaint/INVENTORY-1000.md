# Inventory: src 超 1000 行源码盘点

扫描时间：2026-07-22  
扫描命令：`find src -type f \( -name '*.ts' -o -name '*.tsx' \) | xargs wc -l | sort -nr`  
阈值：≥1000 必拆/必筛；800–999 观察/可顺手拆  

## ≥1000 行（必须处理）

| 优先级 | 文件 | 行数 | 风险 | 拆分策略 |
|--------|------|------|------|----------|
| P0 | `src/app/combo/page.tsx` | 3144 | 中（UI 编排） | 继续抽 StepParamPanel / *StepParams / CanvasPlanPreview / WatermarkPositionPreview / Mobile* 到 `src/components/combo/`；page 只留状态与提交 |
| P0 | `src/app/api/tasks/worker/route.ts` | 1528 | **高** | 仅安全抽离：纯工具函数/legacy 分支注释块；**不**重写调度/claim/dispatch；优先确认 handler registry 已覆盖后删死代码 |
| P1 | `src/app/settings/page.tsx` | 1969 | 中 | 按 provider 卡片 / 模型选择器 / 存储与图床 / 账号区 拆到 `src/components/settings/`；page 编排 + fetch |
| P1 | `src/app/workspace/scene/page.tsx` | 1812 | 中 | 已有内部组件：`SceneProductForm`/`SceneResultsView`/`SceneDesktopWorkspace` 等外提 `src/components/scene/`；hooks 抽 `useSceneGeneration` |
| P2 | `src/app/results/page.tsx` | 1186 | 中低 | 卡片、筛选栏、缩略图、分组逻辑拆组件；列表数据 hook 独立 |
| P2 | `src/app/tools/page.tsx` | 1062 | 中 | `ToolParameterPanel` / `WatermarkDragEditor` / draft helpers 外提 `src/components/tools/` |

## 800–999 行（观察，非本目标强制）

| 文件 | 行数 | 备注 |
|------|------|------|
| `src/app/workspace/listing-set/page.tsx` | 928 | 未超 1000；本目标可不强制，若改 listing-set 再顺手拆 |

## 已完成的部分拆分（combo）

| 模块 | 路径 | 行数 |
|------|------|------|
| 类型 | `src/components/combo/types.ts` | 105 |
| 画布计划 | `src/components/combo/canvas-plan.ts` | 106 |
| 全局快捷条 | `src/components/combo/GlobalQuickBar.tsx` | 123 |
| 全局设置面板 | `src/components/combo/GlobalSettingsPanel.tsx` | 158 |

`combo/page.tsx` 从约 3556 降至 3144（仍远超 1000，继续 P0）。

## 筛选结论

1. **该拆**：上表 6 个 ≥1000 文件全部纳入。  
2. **复用优先**：  
   - UI atoms 已在 `src/components/ui/`，不重复造；  
   - 工作台壳在 `src/components/workbench/`；  
   - combo 预览几何统一走 `computeWatermarkCanvasPlan`；  
   - worker 已有 `src/lib/workbench/handlers/*`，新逻辑不回塞 `worker/route.ts`。  
3. **豁免条件**（须写明）：仅当拆分会破坏 Electron/生产调度且收益极低时，可保留单文件但需在结项扫描里写理由；默认不豁免。  
4. **worker 特殊规则**：先评估 legacy 占比与引用面，只做安全抽离；若用户未批准大改，不整文件重写。

## 建议执行顺序

1. `combo/page.tsx` 继续拆（与扩图预览/修复同一战场）  
2. `fix-outpaint` 根治扩图（可与 combo 拆并行，但提交分开）  
3. `settings` / `scene`  
4. `results` / `tools`  
5. `worker` 受保护评估 + 最小抽离  
6. 全量再扫 ≥1000 + 线上扩图验证  

## 验收对照（inventory-1000）

- [x] 路径 + 行数与 `wc` 扫描一致  
- [x] 给出拆分优先级 P0–P2  
- [x] 标出 worker 高风险边界  
- [x] 记录已有 combo 部分拆分基线  
