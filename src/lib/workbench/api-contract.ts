/**
 * Typed Workflow API Contract
 *
 * Request/response schemas for new workflow task submission.
 * Maps new workflow types to current TaskQueue.type values through a compatibility adapter.
 * Keeps existing /api/tasks functioning during this phase.
 */

import type {
  WorkflowType,
  WorkflowTaskStatus,
  InputAssetRef,
  GeneratedAsset,
  ToolParameters,
  SceneWorkflowDraft,
  ToolRunDraft,
  BatchGroup,
} from '@/types/workbench';
import { WORKFLOW_TO_LEGACY_TYPE, buildLegacyInputData } from '@/types/workbench';

// ---------------------------------------------------------------------------
// Task Creation
// ---------------------------------------------------------------------------

/** POST /api/workflow/tasks */
export interface CreateWorkflowTaskRequest {
  workflowType: WorkflowType;
  inputAssets: InputAssetRef[];
  parameters: ToolParameters;
  batchGroupId?: string;
  projectId?: string;
  priority?: number;
}

/** Response for single task creation */
export interface CreateWorkflowTaskResponse {
  success: true;
  task: WorkflowTaskSummary;
}

/** Response for batch task creation */
export interface CreateBatchWorkflowTasksRequest {
  workflowType: WorkflowType;
  items: Array<{
    inputAssets: InputAssetRef[];
    parameters: ToolParameters;
  }>;
  batchGroupName?: string;
  projectId?: string;
  priority?: number;
}

export interface CreateBatchWorkflowTasksResponse {
  success: true;
  tasks: WorkflowTaskSummary[];
  batchGroup: BatchGroup | null;
}

// ---------------------------------------------------------------------------
// Task Query
// ---------------------------------------------------------------------------

/** GET /api/workflow/tasks */
export interface ListWorkflowTasksRequest {
  status?: WorkflowTaskStatus;
  workflowType?: WorkflowType;
  batchGroupId?: string;
  limit?: number;
  offset?: number;
}

export interface ListWorkflowTasksResponse {
  success: true;
  tasks: WorkflowTaskSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
}

/** GET /api/workflow/tasks/status?ids=... */
export interface BatchTaskStatusRequest {
  ids: string[];
}

export interface BatchTaskStatusResponse {
  success: true;
  tasks: WorkflowTaskSummary[];
}

// ---------------------------------------------------------------------------
// Batch Group
// ---------------------------------------------------------------------------

/** GET /api/workflow/batches */
export interface ListBatchGroupsResponse {
  success: true;
  batches: BatchGroup[];
}

/** GET /api/workflow/batches/:id */
export interface GetBatchGroupResponse {
  success: true;
  batch: BatchGroup;
  tasks: WorkflowTaskSummary[];
}

// ---------------------------------------------------------------------------
// Scene Workflow
// ---------------------------------------------------------------------------

/** POST /api/workflow/scene */
export interface CreateSceneWorkflowRequest extends SceneWorkflowDraft {
  projectId?: string;
}

export interface CreateSceneWorkflowResponse {
  success: true;
  workflowId: string;
  taskIds: string[];
}

/** GET /api/workflow/scene/:id */
export interface GetSceneWorkflowResponse {
  success: true;
  workflow: {
    id: string;
    name: string;
    status: string;
    currentStepIndex: number;
    productInfo: Record<string, unknown>;
    inputAssets: InputAssetRef[];
    generatedAssets: GeneratedAsset[];
    selectedAssetIds: string[];
    batchMode: boolean;
    createdAt: string;
    updatedAt: string;
  };
  tasks: WorkflowTaskSummary[];
}

// ---------------------------------------------------------------------------
// Tool Run
// ---------------------------------------------------------------------------

/** POST /api/workflow/tool */
export interface CreateToolRunRequest extends ToolRunDraft {
  projectId?: string;
}

export interface CreateToolRunResponse {
  success: true;
  runId: string;
  taskIds: string[];
}

// ---------------------------------------------------------------------------
// Shared Summary Type
// ---------------------------------------------------------------------------

/** Lightweight task summary returned by list/status endpoints */
export interface WorkflowTaskSummary {
  id: string;
  workflowType: WorkflowType;
  status: WorkflowTaskStatus;
  progress: number;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  errorMessage?: string;
  originalImageUrl?: string | null;
  resultImageUrl?: string | null;
  videoUrl?: string | null;
  batchGroupId?: string;
  projectId?: string;
  processedImageId?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Compatibility Layer
// ---------------------------------------------------------------------------

/**
 * Adapts a new workflow task request to the legacy TaskQueue format.
 * This allows the new typed contract to submit to the existing /api/tasks endpoint.
 */
export function adaptToLegacyTaskRequest(
  req: CreateWorkflowTaskRequest
): { type: string; inputData: string; priority: number; projectId?: string } {
  const legacyType = WORKFLOW_TO_LEGACY_TYPE[req.workflowType];
  const inputData = buildLegacyInputData(
    req.workflowType,
    req.inputAssets,
    req.parameters
  );
  return {
    type: legacyType,
    inputData,
    priority: req.priority ?? 1,
    projectId: req.projectId,
  };
}

/**
 * Adapts a legacy TaskQueue record to a WorkflowTaskSummary.
 * Used when reading from existing /api/tasks endpoint.
 */
export function adaptLegacyTaskToSummary(task: {
  id: string;
  type: string;
  status: string;
  progress: number;
  currentStep: string | null;
  totalSteps: number;
  completedSteps: number;
  errorMessage?: string | null;
  inputData?: string | null;
  outputData?: string | null;
  processedImageId?: string | null;
  projectId?: string | null;
  createdAt: Date | string;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
}): WorkflowTaskSummary {
  // Lazy-import to avoid circular dependency at module load time
  const { legacyTypeToWorkflowType } = require('@/types/workbench');
  const workflowType = legacyTypeToWorkflowType(task.type);

  let originalImageUrl: string | null = null;
  let resultImageUrl: string | null = null;
  let videoUrl: string | null = null;

  try {
    if (task.inputData) {
      const parsed = JSON.parse(task.inputData) as Record<string, unknown>;
      const asset = parsed.inputAsset as InputAssetRef | undefined;
      originalImageUrl = asset?.clientUrl ?? (parsed.imageUrl as string) ?? null;
    }
  } catch {
    // ignore parse errors
  }

  try {
    if (task.outputData) {
      const parsed = JSON.parse(task.outputData) as Record<string, unknown>;
      const nestedResult = parsed.result as Record<string, unknown> | undefined;
      resultImageUrl =
        (parsed.processedImageUrl as string) ??
        (parsed.processedUrl as string) ??
        (parsed.imageUrl as string) ??
        (nestedResult?.processedUrl as string) ??
        null;
      videoUrl = (parsed.videoUrl as string) ?? null;
    }
  } catch {
    // ignore parse errors
  }

  return {
    id: task.id,
    workflowType,
    status: task.status.toLowerCase() as WorkflowTaskStatus,
    progress: task.progress,
    currentStep: task.currentStep ?? '',
    totalSteps: task.totalSteps,
    completedSteps: task.completedSteps,
    errorMessage: task.errorMessage ?? undefined,
    originalImageUrl,
    resultImageUrl,
    videoUrl,
    projectId: task.projectId ?? undefined,
    processedImageId: task.processedImageId ?? undefined,
    createdAt:
      typeof task.createdAt === 'string'
        ? task.createdAt
        : task.createdAt.toISOString(),
    startedAt: task.startedAt
      ? typeof task.startedAt === 'string'
        ? task.startedAt
        : task.startedAt.toISOString()
      : undefined,
    completedAt: task.completedAt
      ? typeof task.completedAt === 'string'
        ? task.completedAt
        : task.completedAt.toISOString()
      : undefined,
  };
}
