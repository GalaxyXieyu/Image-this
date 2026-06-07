/**
 * Video Generation Workflow Handler
 *
 * Extracted from src/app/api/tasks/worker/route.ts processVideoGeneration.
 * Submits image-to-video tasks via Jimeng/Volcengine and polls for completion.
 * Does NOT create a ProcessedImage — returns video metadata directly.
 */

import { registerHandler, type WorkerContext } from '@/lib/workbench/worker-handlers';
import { validateVideoParams } from '@/lib/workbench/input-validation';
import type { VideoParams } from '@/types/workbench';
import type { VideoGenerationResult } from '@/types/workbench/results';
import fs from 'fs/promises';

// ---------------------------------------------------------------------------
// Asset helpers (mirroring worker globals)
// ---------------------------------------------------------------------------

type TaskAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
};

async function readAssetAsDataUrl(asset?: TaskAssetRef): Promise<string | null> {
  if (!asset?.filePath) return null;
  const buffer = await fs.readFile(asset.filePath);
  const mimeType = asset.mimeType || 'application/octet-stream';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

const videoGenerationHandler = {
  name: 'video_generation',
  workflowType: 'video_generation' as const,

  validateInput(raw: unknown): VideoParams {
    return validateVideoParams(raw);
  },

  async execute(
    ctx: WorkerContext,
    _input: VideoParams,
    rawInput: Record<string, unknown>
  ): Promise<VideoGenerationResult> {
    const { task } = ctx;

    const inputAsset = rawInput.inputAsset as TaskAssetRef | undefined;
    const imageUrl = (await readAssetAsDataUrl(inputAsset)) || (rawInput.imageUrl as string);

    const prompt = rawInput.prompt as string;
    const frames = typeof rawInput.frames === 'number' ? rawInput.frames : 121;
    const aspectRatio = (rawInput.aspectRatio as string) || '16:9';

    await ctx.updateProgress('提交视频生成任务...', 10, 1);

    try {
      const { submitVideoTask, queryVideoTask, downloadAndSaveVideo } = await import(
        '@/app/api/jimeng-video/service'
      );

      // Submit task — imageUrl is actually base64 data
      const { taskId: jimengTaskId } = await submitVideoTask(task.userId, {
        imageBase64: imageUrl,
        prompt,
        frames,
        aspectRatio,
      });

      // Poll for result (max 5 minutes)
      await ctx.updateProgress('视频生成中...', 30, 1);
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const result = await queryVideoTask(task.userId, jimengTaskId);

        if (result.status === 'done' && result.videoUrl) {
          await ctx.updateProgress('保存视频...', 90, 1);
          const localVideoUrl = await downloadAndSaveVideo(result.videoUrl, task.userId);

          await ctx.updateProgress('视频生成完成', 100, 1);
          return {
            videoUrl: localVideoUrl,
            jimengTaskId,
            prompt,
            frames,
            aspectRatio,
          };
        }

        if (result.status === 'not_found' || result.status === 'expired') {
          throw new Error(result.error || '视频生成任务失败或已过期');
        }

        const progress = 30 + (i / maxAttempts) * 50;
        await ctx.updateProgress(`视频生成中 (${i + 1}/${maxAttempts})...`, progress, 1);
        await delay(5000);
      }

      throw new Error('视频生成超时');
    } catch (error) {
      console.error('[视频生成] 处理失败:', error);
      await ctx.updateProgress('视频生成失败', 0, 0);
      throw error;
    }
  },

  normalizeResult(result: VideoGenerationResult): Record<string, unknown> {
    return {
      videoUrl: result.videoUrl,
      jimengTaskId: result.jimengTaskId ?? null,
      prompt: result.prompt ?? null,
      frames: result.frames ?? null,
      aspectRatio: result.aspectRatio ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

registerHandler(videoGenerationHandler);
