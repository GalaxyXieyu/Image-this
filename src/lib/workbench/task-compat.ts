import type { WorkflowTaskStatus, WorkflowType } from '@/types/workbench';

export type LegacyTaskStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export const WORKFLOW_TYPE_LABELS: Record<WorkflowType, string> = {
  scene_generation: '场景图生成',
  background_replace: '背景替换',
  watermark: '水印处理',
  upscale: '高清放大',
  outpaint: '智能扩图',
  one_click: '一键处理',
  video_generation: '视频生成',
};

const LEGACY_TYPE_ALIASES: Record<string, WorkflowType> = {
  SCENE_GENERATION: 'scene_generation',
  scene_generation: 'scene_generation',
  BACKGROUND_REMOVAL: 'background_replace',
  BACKGROUND_REPLACE: 'background_replace',
  background_replace: 'background_replace',
  WATERMARK: 'watermark',
  watermark: 'watermark',
  IMAGE_UPSCALING: 'upscale',
  UPSCALE: 'upscale',
  upscale: 'upscale',
  IMAGE_EXPANSION: 'outpaint',
  OUTPAINT: 'outpaint',
  outpaint: 'outpaint',
  ONE_CLICK_WORKFLOW: 'one_click',
  ONE_CLICK: 'one_click',
  one_click: 'one_click',
  VIDEO_GENERATION: 'video_generation',
  video_generation: 'video_generation',
};

const LEGACY_STATUS_ALIASES: Record<string, WorkflowTaskStatus> = {
  PENDING: 'pending',
  pending: 'pending',
  QUEUED: 'pending',
  queued: 'pending',
  PROCESSING: 'processing',
  RUNNING: 'processing',
  running: 'processing',
  processing: 'processing',
  COMPLETED: 'completed',
  completed: 'completed',
  FAILED: 'failed',
  failed: 'failed',
  CANCELLED: 'cancelled',
  CANCELED: 'cancelled',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export function normalizeWorkflowType(type?: string | null): WorkflowType {
  if (!type) return 'background_replace';
  return LEGACY_TYPE_ALIASES[type] ?? 'background_replace';
}

export function normalizeTaskStatus(status?: string | null): WorkflowTaskStatus {
  if (!status) return 'pending';
  return LEGACY_STATUS_ALIASES[status] ?? 'pending';
}

export function toLegacyTaskStatus(status?: string | null): LegacyTaskStatus {
  const normalized = normalizeTaskStatus(status);
  const map: Record<WorkflowTaskStatus, LegacyTaskStatus> = {
    pending: 'PENDING',
    processing: 'PROCESSING',
    completed: 'COMPLETED',
    failed: 'FAILED',
    cancelled: 'CANCELLED',
  };
  return map[normalized];
}

export function getWorkflowTypeLabel(type?: string | null): string {
  return WORKFLOW_TYPE_LABELS[normalizeWorkflowType(type)];
}

export function inferWorkflowTypeFromTask(type: string, inputData?: string | null): WorkflowType {
  if (inputData) {
    try {
      const parsed = JSON.parse(inputData) as { workflowType?: unknown };
      if (typeof parsed.workflowType === 'string') {
        return normalizeWorkflowType(parsed.workflowType);
      }
    } catch {
      // keep legacy fallback
    }
  }

  return normalizeWorkflowType(type);
}