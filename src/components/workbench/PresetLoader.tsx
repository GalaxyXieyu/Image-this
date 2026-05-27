/**
 * PresetLoader
 *
 * Reads ?preset= query param and logs preset info for debugging.
 * In future phases, this will initialize draft state from preset params.
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getPresetById } from "@/lib/workbench/presets";

interface PresetLoaderProps {
  children: React.ReactNode;
}

export function PresetLoader({ children }: PresetLoaderProps) {
  const searchParams = useSearchParams();
  const presetId = searchParams.get("preset");

  useEffect(() => {
    if (presetId) {
      const preset = getPresetById(presetId);
      if (preset) {
        console.log("[PresetLoader] Loaded preset:", preset.name, preset.id);
      } else {
        console.warn("[PresetLoader] Preset not found:", presetId);
      }
    }
  }, [presetId]);

  return <>{children}</>;
}
