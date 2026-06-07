"use client";

import { useState, useCallback } from "react";
import type { InputAssetRef } from "@/types/workbench";

interface UploadResult {
  inputAsset?: InputAssetRef;
  referenceAsset?: InputAssetRef;
  watermarkLogoAsset?: InputAssetRef;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: { input?: File; reference?: File; watermarkLogo?: File }): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (files.input) formData.append("input", files.input);
      if (files.reference) formData.append("reference", files.reference);
      if (files.watermarkLogo) formData.append("watermarkLogo", files.watermarkLogo);

      const res = await fetch("/api/input-assets", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  return { upload, uploading, error };
}
