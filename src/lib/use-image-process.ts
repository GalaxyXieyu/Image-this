"use client";

import { useState, useCallback } from "react";
import { apiPost } from "./api-client";

interface ProcessOptions {
  type: "background-replace" | "enhance" | "outpaint" | "watermark";
  imageUrl: string;
  params?: Record<string, unknown>;
}

interface ProcessResult {
  id: string;
  imageData?: string;
  processedUrl?: string;
  message: string;
}

export function useImageProcess() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const process = useCallback(async (options: ProcessOptions): Promise<ProcessResult> => {
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const endpointMap: Record<string, string> = {
        "background-replace": "/api/images-process/background-replace",
        enhance: "/api/images-process/enhance",
        outpaint: "/api/images-process/outpaint",
        watermark: "/api/images-process/watermark",
      };

      const endpoint = endpointMap[options.type];
      if (!endpoint) throw new Error(`Unknown process type: ${options.type}`);

      const body: Record<string, unknown> = {
        imageUrl: options.imageUrl,
        ...options.params,
      };

      // background-replace uses originalImageUrl instead of imageUrl
      if (options.type === "background-replace") {
        delete body.imageUrl;
        body.originalImageUrl = options.imageUrl;
      }

      const data = await apiPost<{ success: boolean; data: ProcessResult; message: string }>(
        endpoint,
        body
      );
      setResult(data.data);
      return data.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Processing failed";
      setError(msg);
      throw err;
    } finally {
      setProcessing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { process, processing, result, error, reset };
}
