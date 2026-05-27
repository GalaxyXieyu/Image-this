# Frontend Code Inventory

## Reusable Components (Keep)

| Component | Location | Reuse Plan |
|-----------|----------|------------|
| ImageUploadArea | `src/components/workspace/ImageUploadArea.tsx` | Extract upload logic, reuse in new workbench canvas |
| WatermarkEditorView | `src/components/workspace/WatermarkEditorView.tsx` | Reuse watermark editor internals in tool pages |
| WatermarkSettingsPanel | `src/components/workspace/WatermarkSettingsPanel.tsx` | Reuse as detail panel content |
| TaskProgress | `src/components/workspace/TaskProgress.tsx` | Reuse for batch/task status display |
| ResultModal | `src/components/workspace/ResultModal.tsx` | Reuse result preview modal |
| ImagePreviewModal | `src/components/workspace/ImagePreviewModal.tsx` | Reuse image preview |
| VideoResultModal | `src/components/workspace/VideoResultModal.tsx` | Reuse video result display |
| PromptTemplateSelector | `src/components/workspace/PromptTemplateSelector.tsx` | Reuse in scene workflow and tool pages |
| QualityReviewResult | `src/components/workspace/QualityReviewResult.tsx` | Reuse in scene workflow review step |
| CollapsibleHistorySidebar | `src/components/CollapsibleHistorySidebar.tsx` | Adapt to new detail panel pattern |
| Navbar | `src/components/navigation/Navbar.tsx` | Replace with WorkbenchTopNav |
| FloatingTaskButton | `src/components/navigation/FloatingTaskButton.tsx` | Keep as-is |

## Custom Hooks (Keep)

| Hook | Location | Reuse Plan |
|------|----------|------------|
| useImageUpload | `src/hooks/useImageUpload.ts` | Reuse in new upload components |
| useImageProcessing | `src/hooks/useImageProcessing.ts` | Refactor to use typed workflow contract |
| useTaskPolling | `src/hooks/useTaskPolling.ts` | Replace with useWorkflowTaskPolling |
| useUserPreferences | `src/hooks/useUserPreferences.ts` | Keep as-is |

## Stores (Keep with Refactor Plan)

| Store | Location | Plan |
|-------|----------|------|
| useWorkspaceTabStore | `src/stores/useWorkspaceTabStore.ts` | **Deprecate** - replace with feature-specific stores per workflow/tool |

## Disposable Components (Delete Later)

| Component | Reason |
|-----------|--------|
| `src/app/workspace/page.tsx` | Monolithic, replaced by new route structure |
| `src/components/workspace/WorkspaceSidebar.tsx` | Replaced by WorkbenchSidebar |
| `src/components/workspace/ParameterSettings.tsx` | Tool-specific params will be in detail panels |
| `src/components/workspace/ActionButtons.tsx` | Replaced by WorkbenchActionBar |
| `src/components/workspace/OneClickWatermarkSettings.tsx` | Merge into tool detail panel |
| `src/components/workspace/BatchWarningDialog.tsx` | Move to shared dialogs |
| `src/components/workspace/ReferenceImageUpload.tsx` | Merge into unified upload component |
| `src/components/workspace/VideoStyleSelector.tsx` | Move to video tool page |
| `src/components/workspace/VideoPromptSelector.tsx` | Move to video tool page |

## API Routes (Keep - No Changes)

All existing API routes remain functional. New typed contract layer is additive.

- `/api/tasks/*` - Keep functioning
- `/api/tasks/worker/*` - Keep functioning
- `/api/images-process/*` - Keep functioning
- `/api/input-assets` - Keep functioning
- All provider routes - Keep functioning

## Migration Notes

1. **Phase 1 (Current)**: Build new shell, routes, types, and contract alongside old code.
2. **Phase 2-4**: Build feature pages using new shell, gradually migrating reusable components.
3. **Phase 5**: Switch task submission to typed contract, add `/api/workflow/*` routes.
4. **Phase 6**: Delete old workspace page, tab store, and disposable components.

## Risk: Edge-case Logic in Old Workspace

The old `workspace/page.tsx` contains significant behavior:
- Quality review trigger logic (lines 434-480)
- Video generation flow (lines 812-931)
- Batch warning dialog integration
- History sidebar filtering by tab type
- URL-to-base64 conversion for review

**Mitigation**: Before deletion in Phase 6, extract and port:
1. Quality review trigger into scene workflow step 3
2. Video generation into video tool page
3. History filtering into standalone history page
4. Base64 conversion utilities into shared lib
