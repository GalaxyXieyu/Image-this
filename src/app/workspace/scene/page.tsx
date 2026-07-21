"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ConicSpinner } from "@/components/ui/conic-spinner";
import { getPresetById } from "@/lib/workbench/presets";
import { sceneStyleTemplates } from "@/lib/scene-presets";
import { usePageDraft } from "@/lib/use-page-draft";
import { useIsMobile } from "@/lib/use-is-mobile";
import {
  type Step,
  type WorkflowData,
  StepBar,
  createWorkflowDataFromPreset,
} from "@/components/scene/types-and-helpers";
import {
  GenerateAdjustStep,
  ProductInfoStep,
  SceneDesktopWorkspace,
  StyleTemplateStep,
} from "@/components/scene/scene-views";

function SceneWorkspacePageInner() {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("preset") ?? undefined;
  const activePreset = useMemo(
    () => (presetId ? getPresetById(presetId) : undefined),
    [presetId]
  );
  const sceneStyleId = searchParams.get("sceneStyle") ?? undefined;
  const isDesktop = !useIsMobile(1024);
  const [step, setStep] = usePageDraft<Step>("workbench.scene.step", 1);
  const [workflowData, setWorkflowData] = usePageDraft<WorkflowData>(
    "workbench.scene.workflowData",
    () => createWorkflowDataFromPreset(activePreset)
  );

  useEffect(() => {
    if (!sceneStyleId) return;
    const template = sceneStyleTemplates.find((t) => t.id === sceneStyleId);
    if (!template) return;
    setWorkflowData((prev) => ({
      ...prev,
      selectedTemplates: [template.id],
      selectedPresetId: template.id,
      activePresetName: template.name,
      activePresetDescription: template.desc,
      stylePreference: template.stylePreference,
      productType: prev.productType || template.productType || "",
      candidateCount: template.candidateCount ?? prev.candidateCount,
    }));
    if (isDesktop) {
      // Desktop starts directly in dual-column view with template pre-selected
    } else {
      // Mobile steps to product info after preset selection
      setStep(2);
    }
  }, [sceneStyleId, isDesktop, setStep, setWorkflowData]);

  // Desktop: single dual-column view
  if (isDesktop) {
    return (
      <div className="h-full bg-background">
        <SceneDesktopWorkspace workflowData={workflowData} setWorkflowData={setWorkflowData} />
      </div>
    );
  }

  // Mobile: stepped wizard
  return (
    <div className="h-full flex flex-col bg-background">
      <StepBar currentStep={step} />
      {step === 1 && (
        <StyleTemplateStep
          onNext={() => setStep(2)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
      {step === 2 && (
        <ProductInfoStep
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
      {step === 3 && (
        <GenerateAdjustStep
          onBack={() => setStep(2)}
          workflowData={workflowData}
          setWorkflowData={setWorkflowData}
        />
      )}
    </div>
  );
}

export default function SceneWorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-background" />}>
      <SceneWorkspacePageInner />
    </Suspense>
  );
}
