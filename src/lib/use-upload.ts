"use client";

import { useState, useCallback } from "react";

interface UploadResult {
  inputAsset?: {
    clientUrl: string;
    storageKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
  referenceAsset?: {
    clientUrl: string;
    storageKey: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (files: { input?: File; reference?: File }): Promise<UploadResult> => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      if (files.input) formData.append("input", files.input);
      if (files.reference) formData.append("reference", files.reference);

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
