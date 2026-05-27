# Phase 2: Template Library and Preset Model - Context

**Gathered:** 2026-05-27
**Status:** Ready for execution
**Depends on:** Phase 1 (Workbench Foundation)
**Requirements:** WB-02, WB-07

<domain>

## Phase Boundary

This phase implements the template library as the primary entry point for the new workbench. It must match the Pencil design's three-column layout (category sidebar + template grid + detail panel) and support preset data that can seed scene workflows and tool runs.

</domain>

<decisions>

## Design Source of Truth

- Pencil file `/Users/galaxyxieyu/Documents/image-this.pen` is authoritative for template library layout, spacing, colors, and interactions.
- The template library page (`/templates`) must visually match the design's three-column layout exactly.

### Architecture Direction

- Reuse `WorkbenchShell` and layout primitives from Phase 1.
- Template data model: static seed initially, migrate to DB in later phase if needed.
- Preset must carry enough data to initialize a `SceneWorkflowDraft` or `ToolRunDraft`.

### Data Model Direction

- `TemplatePreset` type extends Phase 1's domain types.
- Categories: 全部模板, 上架图, 白底图, 场景图, 海报设计, 短视频, 图片处理.
- Combo templates: 淘宝全套素材, 抖音带货套装.
- Function nav links to specific tool pages.

</decisions>

<canonical_refs>

## Canonical References

### Product and Design

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md` (WB-02, WB-07)
- `.planning/ROADMAP.md`
- `/Users/galaxyxieyu/Documents/image-this.pen` - visual and IA source (template library frame at y=4700)

### Phase 1 Artifacts

- `src/features/workbench/` - shell components
- `src/types/workbench/index.ts` - domain types
- `src/lib/workbench/api-contract.ts` - API contracts
- `src/app/templates/page.tsx` - route placeholder

### Existing Backend

- `prisma/schema.prisma` - add TemplatePreset model if needed
- `src/lib/image-processor/` - provider parameters for presets

</canonical_refs>

<specifics>

## Pencil Design Details (Template Library)

### Layout

- **Nav bar**: 64px height, bottom border 1px. Left: logo (32px) + "AI 商品视觉工作台". Right: 首页, 模板库 (active), 任务中心, 品牌资产.
- **Sidebar**: 260px width, right border 1px. Sections:
  - "模板分类" header + category list (全部模板 active with primary bg)
  - Divider line
  - "组合模板" header + combo list
  - "功能导航" header + function links (场景图生成 active)
- **Content area**: search toolbar + template grid.
- **Detail panel**: 320px width, left border 1px. Preview area (180px), metadata, action buttons.

### Template Card

- Width: fill container in grid
- Height: 280px
- Fill: `$--card`, cornerRadius: 12, stroke: 1px `$--border`
- Image area: 160px height, `$--muted` fill, icon + "模板预览" label
- Info area: padding 16px, gap 4px
  - Title: Inter 15px weight 500
  - Description: Geist 13px muted
  - Footer: usage count (11px #999) + version badge (11px #0066FF)
  - Actions: "使用模板" (primary color) + "编辑" (#666)

### Colors from Design

- Primary: `#0066FF` (blue)
- Card bg: `$--card`
- Muted bg: `$--muted`
- Border: `$--border`
- Text: `$--foreground`, muted: `$--muted-foreground`
- Fonts: Inter (headings), Geist (body), Funnel Sans (badge)

</specifics>

<deferred>

## Deferred Ideas

- DB migration for presets (can be Phase 5 when worker contract solidifies).
- User-created custom presets (post-MVP).
- Template marketplace/sharing (out of scope).

</deferred>
