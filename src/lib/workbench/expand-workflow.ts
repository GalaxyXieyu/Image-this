/**
 * 工作流步骤展开工具
 *
 * 支持递归展开嵌套工作流（type:'workflow'），并进行环检测、深度限制、步数限制。
 * 执行时保证实时性：在 handleExecute 前重新 GET /api/workflow-templates
 */

// 通用步骤类型：兼容所有步骤类型（包括 workflow）
type WorkflowStep = {
  id: string;
  order: number;
  type: string;
  name: string;
  description: string;
  params: Record<string, any>;
  refTemplateId?: string;
};

type WorkflowTemplate = {
  id: string;
  name: string;
  steps: WorkflowStep[];
};

export class CycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CycleError";
  }
}

export class DepthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DepthError";
  }
}

export class StepsLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StepsLimitError";
  }
}

export class MissingTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingTemplateError";
  }
}

const MAX_NEST_DEPTH = 5;
const MAX_TOTAL_STEPS = 30;

/**
 * 递归展开工作流步骤
 *
 * @param steps 当前步骤列表
 * @param templatesById 模板字典：{ id -> WorkflowTemplate }
 * @param options 选项：{ depth=0 }
 * @returns 展开后的扁平步骤列表（均为可执行叶子步骤）
 * @throws CycleError 检测到循环引用
 * @throws DepthError 嵌套深度超过限制
 * @throws StepsLimitError 总步数超过限制
 * @throws MissingTemplateError 引用的模板不存在或已被删除
 */
export function expandSteps(
  steps: WorkflowStep[],
  templatesById: Record<string, WorkflowTemplate>,
  options: { depth?: number; visited?: Set<string> } = {}
): WorkflowStep[] {
  const depth = options.depth ?? 0;
  const visited = options.visited ?? new Set<string>();

  if (depth > MAX_NEST_DEPTH) {
    throw new DepthError(
      `嵌套工作流深度超过限制（最多 ${MAX_NEST_DEPTH} 层）`
    );
  }

  const result: WorkflowStep[] = [];

  for (const step of steps) {
    if (step.type === "workflow") {
      if (!step.refTemplateId) {
        throw new MissingTemplateError(
          `工作流步骤 "${step.name}" 缺少 refTemplateId`
        );
      }

      // 环检测
      if (visited.has(step.refTemplateId)) {
        throw new CycleError(
          `检测到循环引用：工作流 "${step.refTemplateId}" 在展开路径中重复出现`
        );
      }

      // 查找被引用的模板
      const template = templatesById[step.refTemplateId];
      if (!template) {
        throw new MissingTemplateError(
          `引用的工作流模板 "${step.refTemplateId}" 不存在或已被删除`
        );
      }

      // 递归展开：新增该模板 ID 到 visited 集合
      const newVisited = new Set(visited);
      newVisited.add(step.refTemplateId);

      const expandedSteps = expandSteps(template.steps, templatesById, {
        depth: depth + 1,
        visited: newVisited,
      });

      result.push(...expandedSteps);
    } else {
      // 非 workflow 步骤直接加入结果
      result.push(step);
    }
  }

  // 检查总步数限制（仅在顶层检查）
  if (depth === 0 && result.length > MAX_TOTAL_STEPS) {
    throw new StepsLimitError(
      `展开后的总步数超过限制（最多 ${MAX_TOTAL_STEPS} 步，当前 ${result.length} 步）`
    );
  }

  // 顶层重排 order（从 1 开始）
  if (depth === 0) {
    return result.map((s, idx) => ({
      ...s,
      order: idx + 1,
    }));
  }

  return result;
}
