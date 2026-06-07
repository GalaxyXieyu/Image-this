/**
 * Typed Worker Handler Registry
 *
 * Each workflow type registers a handler that encapsulates:
 * - Input validation (runtime type narrowing)
 * - Execution logic (provider calls, image processing)
 * - Result normalization (consistent output shape)
 *
 * The worker dispatch table replaces the large switch statement
 * incrementally. Old tasks (contractVersion = 1) still fall back
 * to the legacy switch until their handler is verified.
 */

import type { WorkflowType, ToolParameters } from '@/types/workbench';
import type { AnyWorkflowResult } from '@/types/workbench/results';

/**
 * Minimal representation of a queued task needed by handlers.
 * Decoupled from Prisma types to keep handlers framework-agnostic.
 */
export interface QueueTask {
  id: string;
  type: string;
  inputData: string;
  totalSteps: number;
  userId: string;
  retryCount?: number;
  maxRetries?: number;
  contractVersion?: number;
  workflowType?: string | null;
  handlerName?: string | null;
}

/**
 * Context passed to every handler execution.
 */
export interface WorkerContext {
  task: QueueTask;
  userId: string;
  updateProgress: (step: string, progress: number, completedSteps: number) => Promise<void>;
}

/**
 * Interface that every workflow handler must implement.
 *
 * @template TInput - Narrowed ToolParameters subtype this handler accepts
 * @template TResult - Result subtype this handler produces
 */
export interface WorkflowHandler<
  TInput extends ToolParameters = ToolParameters,
  TResult extends AnyWorkflowResult = AnyWorkflowResult,
> {
  /** Registry key — used for handler lookup */
  name: string;

  /** The workflow type this handler processes */
  workflowType: WorkflowType;

  /** Validate and narrow raw parsed input to the expected shape */
  validateInput(raw: unknown): TInput;

  /** Execute the workflow — call providers, process images, etc. */
  execute(ctx: WorkerContext, input: TInput): Promise<TResult>;

  /** Normalize handler result into a plain object for JSON serialization */
  normalizeResult(result: TResult): Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const WORKFLOW_HANDLERS = new Map<string, WorkflowHandler<any, any>>();

export function registerHandler<
  TInput extends ToolParameters,
  TResult extends AnyWorkflowResult,
>(handler: WorkflowHandler<TInput, TResult>): void {
  WORKFLOW_HANDLERS.set(handler.name, handler);
}

export function getHandler(name: string): WorkflowHandler<any, any> | undefined {
  return WORKFLOW_HANDLERS.get(name);
}

export function hasHandler(name: string): boolean {
  return WORKFLOW_HANDLERS.has(name);
}

export function listHandlers(): string[] {
  return Array.from(WORKFLOW_HANDLERS.keys());
}

export function getHandlerByWorkflowType(workflowType: WorkflowType): WorkflowHandler<any, any> | undefined {
  for (const handler of WORKFLOW_HANDLERS.values()) {
    if (handler.workflowType === workflowType) {
      return handler;
    }
  }
  return undefined;
}

/**
 * Resolve handler for a task.
 * Priority: handlerName field -> workflowType -> legacy type name
 */
export function resolveHandler(
  handlerName: string | null | undefined,
  workflowType: string | null | undefined,
  legacyType: string
): WorkflowHandler<any, any> | undefined {
  if (handlerName) {
    const byName = getHandler(handlerName);
    if (byName) return byName;
  }
  if (workflowType) {
    const byWorkflow = getHandler(workflowType);
    if (byWorkflow) return byWorkflow;
  }
  return getHandler(legacyType);
}
