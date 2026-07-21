"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/api-client";
import { useWorkflowTaskPolling } from "@/hooks/workbench/useWorkflowTaskPolling";
import { mapProviderErrorMessage } from "@/lib/provider-error-utils";
import { useToast } from "@/components/ui/use-toast";
import { hasEnabledImageModel } from "@/lib/ensure-model";
import { usePageDraft } from "@/lib/use-page-draft";
import { buildSceneLegacyTaskRequests } from "@/lib/workbench/scene-task-adapter";
import type { InputAssetRef, WorkflowTaskStatus } from "@/types/workbench";
import {
  type SceneCandidateResult,
  type UseSceneGenerationResult,
  type WorkflowData,
  getCompactFilename,
  getProductAssets,
  isTerminalCandidateStatus,
} from "@/components/scene/types-and-helpers";

export function useSceneGeneration(workflowData: WorkflowData): UseSceneGenerationResult {
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = usePageDraft<SceneCandidateResult[]>("workbench.scene.results", []);
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const { toast } = useToast();
  const { tasks: polledTasks, isPolling, startPolling, error: pollingError } = useWorkflowTaskPolling({
    interval: 3000,
    autoStart: false,
  });

  useEffect(() => {
    if (polledTasks.length === 0) return;
    setResults((prev) =>
      prev.map((result) => {
        if (!result.taskId) return result;
        const task = polledTasks.find((item) => item.id === result.taskId);
        if (!task) return result;
        return {
          ...result,
          status: task.status,
          progress: task.progress,
          currentStep: task.currentStep,
          resultImageUrl: task.resultImageUrl,
          errorMessage: task.errorMessage ? mapProviderErrorMessage(task.errorMessage) : undefined,
          usedModel: task.usedModel,
        };
      })
    );
  }, [polledTasks, setResults]);

  const activeTaskIds = useMemo(
    () => results.filter((result) => !isTerminalCandidateStatus(result.status) && result.taskId).map((result) => result.taskId as string),
    [results]
  );
  const pollingTaskKeyRef = useRef("");

  useEffect(() => {
    const taskKey = [...activeTaskIds].sort().join(",");
    if (!taskKey || pollingTaskKeyRef.current === taskKey) return;
    pollingTaskKeyRef.current = taskKey;
    startPolling(activeTaskIds);
  }, [activeTaskIds, startPolling]);

  const completedCount = results.filter((result) => result.status === "completed").length;
  const failedCount = results.filter((result) => result.status === "failed" || result.status === "cancelled").length;
  const activeCount = results.filter((result) => !isTerminalCandidateStatus(result.status)).length;
  const productAssets = getProductAssets(workflowData);

  const handleSaveResult = async (result: SceneCandidateResult) => {
    if (result.status !== "completed" || !result.resultImageUrl) {
      toast({
        title: "暂时不能保存",
        description: "只有已完成且有结果图的候选可以保存。",
        variant: "destructive",
      });
      return;
    }

    if (result.savedImageId) {
      toast({
        title: "结果已保存",
        description: "这个候选已经在结果管理中。",
      });
      return;
    }

    setSavingCandidateId(result.id);
    try {
      const originalUrl = result.sourceAsset?.clientUrl ?? workflowData.inputAsset?.clientUrl ?? result.resultImageUrl;
      const response = await apiPost<{
        success: boolean;
        image: { id: string };
      }>("/api/images", {
        filename: `${workflowData.productName || "场景图"}-${result.name}.png`,
        originalUrl,
        processedUrl: result.resultImageUrl,
        thumbnailUrl: result.resultImageUrl,
        processType: "BACKGROUND_REMOVAL",
        status: "COMPLETED",
        metadata: JSON.stringify({
          workflowType: "scene_generation",
          taskId: result.taskId,
          candidateId: result.id,
          sourceAssetId: result.sourceAsset?.assetId,
          sourceAssetName: result.sourceAsset?.originalFilename,
          sourceIndex: result.sourceIndex,
          candidateIndex: result.candidateIndex,
          selectedPresetId: workflowData.selectedPresetId,
          presetName: workflowData.activePresetName,
          productName: workflowData.productName,
          productType: workflowData.productType,
          targetAudience: workflowData.targetAudience,
          usageScene: workflowData.usageScene,
          sellingPoints: workflowData.sellingPoints,
          selectedTemplates: workflowData.selectedTemplates,
          aiModel: workflowData.aiModel,
          usedModel: result.usedModel,
          outputResolution: workflowData.outputResolution,
          savedAt: new Date().toISOString(),
        }),
      });

      setResults((prev) =>
        prev.map((item) =>
          item.id === result.id ? { ...item, savedImageId: response.image.id } : item
        )
      );
      toast({
        title: "已保存到结果管理",
        description: "可以在结果管理中查看和下载这张场景图。",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setSavingCandidateId(null);
    }
  };

  const handleGenerate = async () => {
    if (!(await hasEnabledImageModel())) {
      toast({ title: "还没有配置模型 Key", description: "请先到「设置 → AI 模型配置」配置并启用模型后再生成，否则任务无法运行。", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const candidateCount = Math.max(1, workflowData.candidateCount || 1);
      const taskRequests = buildSceneLegacyTaskRequests({
        productInfo: {
          name: workflowData.productName,
          category: workflowData.productType,
          description: workflowData.targetAudience,
          stylePreference: workflowData.stylePreference || workflowData.usageScene,
        },
        inputAssets: [...productAssets, workflowData.referenceAsset].filter(
          (asset): asset is InputAssetRef => Boolean(asset)
        ),
        inputAsset: productAssets[0],
        productAssets,
        referenceAsset: workflowData.referenceAsset,
        selectedPresetId: workflowData.selectedPresetId,
        styleTemplateIds: workflowData.selectedTemplates,
        stylePreference: workflowData.stylePreference || workflowData.usageScene,
        sellingPoints: workflowData.sellingPoints,
        batchMode: workflowData.batchMode,
        parameters: {
          aiModel: workflowData.aiModel,
          outputResolution: workflowData.outputResolution,
          candidateCount,
        },
      });

      const response = await apiPost<{
        success: boolean;
        tasks?: Array<{ id: string }>;
        task?: { id: string };
      }>("/api/tasks", taskRequests.length === 1 ? taskRequests[0] : taskRequests);

      const tasks = response.tasks ?? (response.task ? [response.task] : []);
      const createdTaskIds = tasks.map((task) => task.id);
      setResults(
        tasks.map((task, index) => {
          const sourceIndex = Math.floor(index / candidateCount);
          const candidateIndex = (index % candidateCount) + 1;
          const sourceAsset = productAssets[sourceIndex] ?? productAssets[0];
          const sourceName = getCompactFilename(sourceAsset?.originalFilename);
          return {
            id: task.id,
            taskId: task.id,
            name: productAssets.length > 1
              ? `${sourceName} · 候选 ${candidateIndex}`
              : `${workflowData.activePresetName ?? "场景图"}候选 ${candidateIndex}`,
            sourceAsset,
            sourceIndex: sourceIndex + 1,
            candidateIndex,
            status: "queued" as const,
            progress: 0,
          };
        })
      );
      if (createdTaskIds.length > 0) {
        startPolling(createdTaskIds);
      }
      toast({
        title: "生成任务已创建",
        description: `已创建 ${tasks.length} 个场景图任务，可在任务中心查看进度。`,
      });
    } catch (error) {
      toast({
        title: "创建任务失败",
        description: error instanceof Error ? error.message : "请检查素材和模型配置后重试",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return {
    results,
    generating,
    savingCandidateId,
    completedCount,
    failedCount,
    activeCount,
    isPolling,
    pollingError,
    handleGenerate,
    handleSaveResult,
  };
}

