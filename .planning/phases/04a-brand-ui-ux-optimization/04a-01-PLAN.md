---
phase: 04a-brand-ui-ux-optimization
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/globals.css
  - src/components/ui/button.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/progress.tsx
autonomous: true
requirements:
  - BRAND-01
  - BRAND-02
  - BRAND-03
must_haves:
  truths:
    - "shadcn primary color renders as brand blue (#2563FF) in both light and dark mode"
    - "Button component supports brand, ai, and gradient variants"
    - "Badge component supports ai, success, warning, danger, and processing variants"
    - "Progress indicator uses brand blue consistently"
    - "Brand gradient utilities are available as Tailwind classes"
    - "All existing variant usages continue to compile and render correctly"
  artifacts:
    - path: "src/app/globals.css"
      provides: "Unified token system with brand colors, AI colors, and gradient utilities"
      contains:
        - "--color-primary: #2563FF"
        - "--color-ai: #7C3AED"
        - "--color-ai-soft: #EDE9FE"
        - ".bg-brand-gradient"
        - ".bg-brand-gradient-light"
    - path: "src/components/ui/button.tsx"
      provides: "Extended button variants: brand, ai, gradient"
      exports: ["Button", "buttonVariants"]
    - path: "src/components/ui/badge.tsx"
      provides: "Extended badge variants: ai, success, warning, danger, processing"
      exports: ["Badge", "badgeVariants"]
    - path: "src/components/ui/progress.tsx"
      provides: "Progress using brand blue fill"
      exports: ["Progress"]
  key_links:
    - from: "src/components/ui/button.tsx"
      to: "src/app/globals.css"
      via: "Tailwind classes referencing --color-primary, --color-ai"
    - from: "src/components/ui/badge.tsx"
      to: "src/app/globals.css"
      via: "Tailwind classes referencing --color-ai, --color-destructive"
    - from: "src/components/ui/progress.tsx"
      to: "src/app/globals.css"
      via: "bg-primary class resolves to --color-primary (#2563FF)"
---

<objective>
Establish the brand-aligned design token baseline and extend shadcn/ui primitives (button, badge, progress) with brand-compliant variants. This is Wave 1 of Phase 04a — no page changes, only the foundational token + component layer.

Purpose: All subsequent Wave 2-4 page work depends on these tokens and variants being available and correct.
Output: A single unified CSS token system + extended UI primitives that express the brand spec (`docs/brand-ui-spec.md`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/04a-brand-ui-ux-optimization/04a-CONTEXT.md
@docs/brand-ui-spec.md

## Current Token State (from src/app/globals.css)

The file has THREE overlapping systems:

1. **shadcn @theme tokens** (lines 5-49): `--color-primary: #171717` (near-black), `--color-primary-foreground: #fafafa`
2. **Workbench tokens** (lines 27-48): `--color-wb-accent: #2563eb` (close to brand blue), `--color-wb-success: #10b981`, etc.
3. **Legacy :root CSS variables** (lines 133-149): `--primary-blue: #2563eb`, `--primary-orange: #f97316`, etc.
4. **shadcn @layer base HSL tokens** (lines 151-205): `--primary: 0 0% 9%` (separate HSL system used by some components)

Dark mode (lines 51-85) mirrors the same split.

## Brand Spec Color Requirements

| Token | Light | Dark | Usage |
|---|---|---|---|
| Primary (CTA) | `#2563FF` | `#60A5FA` | Buttons, links, selection, progress |
| Primary hover | `#1D4ED8` | `#93C5FD` | hover/active states |
| AI accent | `#7C3AED` | `#A78BFA` | AI generation, templates, capability tags |
| AI soft | `#EDE9FE` | — | AI label backgrounds, light gradients |
| Success | `#10B981` | `#34D399` | Complete, success |
| Warning | `#FBBF24` | `#FDE68A` | Waiting, warning |
| Danger | `#EF4444` | `#F87171` | Error, delete, failure |
| Processing | `#2563FF` | `#60A5FA` | In-progress (same as primary) |

## Gradients (from spec section 4.5)

| Name | Value | Usage |
|---|---|---|
| Primary brand | `#2563FF → #7C3AED` | Hero, main CTA, generate buttons |
| Light glow | `#DBEAFE → #EDE9FE → #FFFFFF` | Page backgrounds, empty states |

## Existing Variant Usage (85 call sites)

- `variant="default"` — primary action buttons (will become blue)
- `variant="destructive"` — delete/failure actions
- `variant="secondary"` — secondary actions
- `variant="outline"` — bordered buttons
- `variant="ghost"` — icon buttons, subtle actions
- `variant="link"` — text links

None of the 85 call sites use `brand`, `ai`, or `gradient` yet — these are new variants for Wave 2+ page work.

## Interface Contracts

From `src/components/ui/button.tsx`:
```typescript
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
export { Button, buttonVariants }
```

From `src/components/ui/badge.tsx`:
```typescript
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}
export { Badge, badgeVariants }
```

From `src/components/ui/progress.tsx`:
```typescript
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>
export { Progress }
```
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Unify globals.css token system</name>
  <files>src/app/globals.css</files>
  <action>
Update `src/app/globals.css` to unify the three overlapping token systems into a single brand-aligned system.

**Changes to make:**

1. **Update shadcn @theme primary tokens** (lines 12-13):
   - Change `--color-primary: #171717` to `--color-primary: #2563FF`
   - Change `--color-primary-foreground: #fafafa` to `--color-primary-foreground: #ffffff`

2. **Update shadcn @theme secondary tokens** (lines 14-15):
   - Change `--color-secondary: #f5f5f5` to `--color-secondary: #F1F5F9` (slate-100, matches brand neutral)
   - Keep `--color-secondary-foreground: #171717` as-is (dark text on light secondary)

3. **Update shadcn @theme muted tokens** (lines 16-17):
   - Change `--color-muted: #f5f5f5` to `--color-muted: #F1F5F9`
   - Change `--color-muted-foreground: #737373` to `--color-muted-foreground: #64748B` (slate-500)

4. **Update shadcn @theme accent tokens** (lines 18-19):
   - Change `--color-accent: #f5f5f5` to `--color-accent: #DBEAFE` (blue-100, soft brand accent)
   - Change `--color-accent-foreground: #171717` to `--color-accent-foreground: #1D4ED8` (blue-700)

5. **Update shadcn @theme border/ring tokens** (lines 22-24):
   - Change `--color-border: #e5e5e5` to `--color-border: #E2E8F0` (slate-200)
   - Change `--color-input: #e5e5e5` to `--color-input: #E2E8F0`
   - Change `--color-ring: #171717` to `--color-ring: #93C5FD` (blue-300, focus ring)

6. **Add new brand tokens** after the existing @theme block (after line 25, before the closing `}`):
   ```css
   --color-ai: #7C3AED;
   --color-ai-foreground: #ffffff;
   --color-ai-soft: #EDE9FE;
   --color-success: #10B981;
   --color-success-foreground: #ffffff;
   --color-warning: #FBBF24;
   --color-warning-foreground: #0F172A;
   --color-processing: #2563FF;
   --color-processing-foreground: #ffffff;
   ```

7. **Update workbench tokens** (lines 36-41) to align with brand:
   - Change `--color-wb-accent: #2563eb` to `--color-wb-accent: #2563FF` (exact brand blue)
   - Change `--color-wb-accent-hover: #1d4ed8` to `--color-wb-accent-hover: #1D4ED8` (exact brand deep blue)
   - Change `--color-wb-accent-light: #eff6ff` to `--color-wb-accent-light: #DBEAFE` (exact brand soft blue)
   - Change `--color-wb-warning: #f59e0b` to `--color-wb-warning: #FBBF24` (exact brand yellow)
   - Keep `--color-wb-success: #10b981` and `--color-wb-error: #ef4444` as-is (already match)

8. **Update dark mode @theme** (lines 51-72):
   - Change `--color-primary: #fafafa` to `--color-primary: #60A5FA` (blue-400, dark mode primary)
   - Change `--color-primary-foreground: #171717` to `--color-primary-foreground: #0F172A` (slate-900)
   - Change `--color-secondary: #262626` to `--color-secondary: #1E293B` (slate-800)
   - Change `--color-muted: #262626` to `--color-muted: #1E293B`
   - Change `--color-muted-foreground: #a3a3a3` to `--color-muted-foreground: #94A3B8` (slate-400)
   - Change `--color-accent: #262626` to `--color-accent: #1E3A5F` (dark blue tint)
   - Change `--color-accent-foreground: #fafafa` to `--color-accent-foreground: #93C5FD` (blue-300)
   - Change `--color-border: #262626` to `--color-border: #1F2937` (slate-800)
   - Change `--color-input: #262626` to `--color-input: #1F2937`
   - Change `--color-ring: #d4d4d8` to `--color-ring: #60A5FA` (blue-400)
   - Add dark mode brand tokens:
     ```css
     --color-ai: #A78BFA;
     --color-ai-foreground: #0F172A;
     --color-ai-soft: #4C1D95;
     --color-success: #34D399;
     --color-success-foreground: #0F172A;
     --color-warning: #FDE68A;
     --color-warning-foreground: #0F172A;
     --color-processing: #60A5FA;
     --color-processing-foreground: #0F172A;
     ```

9. **Update dark mode workbench tokens** (lines 81-83):
   - Change `--color-wb-accent: #3b82f6` to `--color-wb-accent: #60A5FA`
   - Change `--color-wb-accent-hover: #60a5fa` to `--color-wb-accent-hover: #93C5FD`
   - Change `--color-wb-accent-light: #1e3a5f` to `--color-wb-accent-light: #1E3A5F` (already correct, keep)

10. **Add brand gradient utilities** after the `@theme` blocks, before `body` (around line 87):
    ```css
    @layer utilities {
      .bg-brand-gradient {
        background: linear-gradient(135deg, #2563FF 0%, #7C3AED 100%);
      }
      .bg-brand-gradient-light {
        background: linear-gradient(135deg, #DBEAFE 0%, #EDE9FE 50%, #FFFFFF 100%);
      }
      .bg-brand-gradient-dark {
        background: linear-gradient(135deg, #020617 0%, #1E1B4B 50%, #2563FF 100%);
      }
      .text-brand-gradient {
        background: linear-gradient(135deg, #2563FF 0%, #7C3AED 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }
    ```

11. **Update legacy :root CSS variables** (lines 139-144) to match brand exactly:
    - Change `--primary-blue: #2563eb` to `--primary-blue: #2563FF`
    - Change `--primary-blue-hover: #1d4ed8` to `--primary-blue-hover: #1D4ED8`
    - Change `--primary-blue-light: #dbeafe` to `--primary-blue-light: #DBEAFE`
    - Change `--primary-blue-lighter: #eff6ff` to `--primary-blue-lighter: #EFF6FF`
    - Change `--primary-blue-border: #93c5fd` to `--primary-blue-border: #93C5FD`
    - Change `--primary-blue-ring: #3b82f6` to `--primary-blue-ring: #3B82F6`

12. **Update @layer base HSL tokens** (lines 159-161) to align:
    - Change `--primary: 0 0% 9%` to `--primary: 221 83% 58%` (HSL for #2563FF)
    - Change `--primary-foreground: 0 0% 98%` to `--primary-foreground: 0 0% 100%`
    - Change `--ring: 0 0% 3.9%` to `--ring: 213 94% 78%` (HSL for #93C5FD)

13. **Update dark mode HSL tokens** (lines 186, 198):
    - Change `--primary: 0 0% 98%` to `--primary: 213 94% 68%` (HSL for #60A5FA)
    - Change `--primary-foreground: 0 0% 9%` to `--primary-foreground: 222 47% 11%` (HSL for #0F172A)
    - Change `--ring: 0 0% 83.1%` to `--ring: 213 94% 68%` (HSL for #60A5FA)

**What NOT to change:**
- Keep `--color-background`, `--color-foreground`, `--color-card`, `--color-popover` as-is (neutral is correct)
- Keep `--color-destructive: #ef4444` and `--color-destructive-foreground: #fafafa` (already correct)
- Keep `--radius: 0.5rem`
- Keep all panel dimension variables (`--wb-sidebar-width`, etc.)
- Keep animation and scrollbar styles
- Keep `--primary-orange*` legacy variables (they are still used somewhere; do not break existing code)
- Keep `--neutral-gray*` legacy variables
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `src/app/globals.css` compiles without error
    - `--color-primary` resolves to `#2563FF` in light mode, `#60A5FA` in dark mode
    - New tokens `--color-ai`, `--color-ai-soft`, `--color-success`, `--color-warning`, `--color-processing` exist in both light and dark @theme blocks
    - Gradient utilities `.bg-brand-gradient`, `.bg-brand-gradient-light`, `.text-brand-gradient` are defined
    - Workbench tokens are aligned to brand hex values
    - No existing page breaks from token changes
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend Button with brand, ai, and gradient variants</name>
  <files>src/components/ui/button.tsx</files>
  <action>
Extend `src/components/ui/button.tsx` to add three new variants while preserving all existing ones.

**Changes to make:**

In the `buttonVariants` CVA definition, add three new entries to the `variant` object (after `link`, before the closing brace):

```typescript
brand:
  "bg-[#2563FF] text-white hover:bg-[#1D4ED8] focus-visible:ring-[#2563FF] shadow-sm",
ai:
  "bg-[#7C3AED] text-white hover:bg-[#6D28D9] focus-visible:ring-[#7C3AED] shadow-sm",
gradient:
  "bg-brand-gradient text-white hover:opacity-90 focus-visible:ring-[#2563FF] shadow-sm",
```

**Rationale for hardcoded hex in brand/ai:**
- The `bg-brand-gradient` utility references `@theme` tokens via CSS custom properties, so it works with Tailwind's `bg-*` class resolution.
- For solid color backgrounds, CVA class strings need explicit colors. Using `bg-primary` would work for `brand` but not for `ai` (violet is not the primary). Using `bg-[#2563FF]` is explicit and avoids ambiguity.
- The hover states use the brand spec deep colors: `#1D4ED8` for blue hover, `#6D28D9` for violet hover.

**What NOT to change:**
- Do NOT modify existing `default`, `destructive`, `outline`, `secondary`, `ghost`, or `link` variant definitions
- Do NOT change the `size` variants
- Do NOT change the `ButtonProps` interface
- Do NOT change the `Button` component implementation
- Do NOT modify any of the 85 existing call sites
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `buttonVariants` includes `brand`, `ai`, and `gradient` entries
    - Existing variants (default, destructive, outline, secondary, ghost, link) are unchanged
    - `npm run build` passes with no TypeScript or ESLint errors
    - All 85 existing `variant="..."` call sites still compile
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Extend Badge with semantic status variants</name>
  <files>src/components/ui/badge.tsx</files>
  <action>
Extend `src/components/ui/badge.tsx` to add five new semantic variants while preserving all existing ones.

**Changes to make:**

In the `badgeVariants` CVA definition, add five new entries to the `variant` object (after `outline`, before the closing brace):

```typescript
ai: "border-transparent bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#DDD6FE]",
success: "border-transparent bg-[#D1FAE5] text-[#059669] hover:bg-[#A7F3D0]",
warning: "border-transparent bg-[#FEF3C7] text-[#D97706] hover:bg-[#FDE68A]",
danger: "border-transparent bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA]",
processing: "border-transparent bg-[#DBEAFE] text-[#2563FF] hover:bg-[#BFDBFE]",
```

**Color rationale (all from brand spec):**

| Variant | Background | Text | Hover bg |
|---|---|---|---|
| ai | `#EDE9FE` (violet-100) | `#7C3AED` (violet-600) | `#DDD6FE` (violet-200) |
| success | `#D1FAE5` (emerald-100) | `#059669` (emerald-600) | `#A7F3D0` (emerald-200) |
| warning | `#FEF3C7` (amber-100) | `#D97706` (amber-600) | `#FDE68A` (amber-200) |
| danger | `#FEE2E2` (red-100) | `#DC2626` (red-600) | `#FECACA` (red-200) |
| processing | `#DBEAFE` (blue-100) | `#2563FF` (brand blue) | `#BFDBFE` (blue-200) |

These are "soft" badge variants (light background + dark text) suitable for inline status labels, matching the spec's "标签: 浅底深字" rule.

**What NOT to change:**
- Do NOT modify existing `default`, `secondary`, `destructive`, or `outline` variant definitions
- Do NOT change the `BadgeProps` interface
- Do NOT change the `Badge` component implementation
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `badgeVariants` includes `ai`, `success`, `warning`, `danger`, and `processing` entries
    - Existing variants (default, secondary, destructive, outline) are unchanged
    - `npm run build` passes with no TypeScript or ESLint errors
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Verify Progress uses brand blue and confirm build</name>
  <files>src/components/ui/progress.tsx</files>
  <action>
Verify `src/components/ui/progress.tsx` will render with brand blue after Task 1 token changes, and make one explicit improvement.

**Current state:**
- Line 15: `bg-primary/20` (track background)
- Line 21: `bg-primary` (fill indicator)

After Task 1, `--color-primary` becomes `#2563FF` in light mode and `#60A5FA` in dark mode. So `bg-primary` will automatically resolve to brand blue. No change needed for basic correctness.

**One improvement to make:**
Add a subtle transition to the indicator for smoother progress updates:

Change line 21 from:
```typescript
className="h-full w-full flex-1 bg-primary transition-all"
```
to:
```typescript
className="h-full w-full flex-1 bg-primary transition-all duration-300 ease-out"
```

This makes progress bar movement feel smoother without changing the color.

**What NOT to change:**
- Do NOT change `bg-primary` to a hardcoded color — the token system is the correct source of truth
- Do NOT change the track `bg-primary/20` — the 20% opacity track is correct
- Do NOT change the component's props interface or forwardRef structure
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - Progress fill uses `bg-primary` which resolves to brand blue via the unified token system
    - Progress indicator has smooth `duration-300 ease-out` transition
    - `npm run build` passes
  </done>
</task>

</tasks>

<verification>
1. Run `npm run build` — must pass with zero errors.
2. Run `npm run lint` — must pass (or only show pre-existing issues).
3. Verify token values: grep for `--color-primary: #2563FF` in globals.css.
4. Verify button variants: grep for `"brand"` and `"gradient"` in button.tsx.
5. Verify badge variants: grep for `"ai"` and `"processing"` in badge.tsx.
6. Verify no existing variant call sites were broken: `grep -rn 'variant="default"\|variant="destructive"\|variant="outline"\|variant="secondary"\|variant="ghost"\|variant="link"' src/app/ src/components/ | wc -l` should still show ~85.
</verification>

<success_criteria>
1. `src/app/globals.css` has a single unified token system where `--color-primary` is brand blue (`#2563FF`).
2. `--color-ai` (`#7C3AED`), `--color-ai-soft` (`#EDE9FE`), and semantic status tokens exist in both light and dark mode.
3. Brand gradient utilities (`.bg-brand-gradient`, `.bg-brand-gradient-light`, `.text-brand-gradient`) are available.
4. `src/components/ui/button.tsx` has `brand`, `ai`, and `gradient` variants in addition to existing ones.
5. `src/components/ui/badge.tsx` has `ai`, `success`, `warning`, `danger`, and `processing` variants in addition to existing ones.
6. `src/components/ui/progress.tsx` uses `bg-primary` (brand blue) with smooth transition.
7. `npm run build` passes with no new errors.
8. All 85 existing variant call sites continue to compile.
</success_criteria>

<output>
After completion, create `.planning/phases/04a-brand-ui-ux-optimization/04a-01-SUMMARY.md`
</output>
