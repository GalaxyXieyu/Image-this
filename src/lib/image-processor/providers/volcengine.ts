/**
 * 火山引擎图片处理器
 */

import { IImageProcessor, ProcessResult, VolcengineConfig } from '../types';
import { enhanceWithVolcengine, outpaintWithVolcengine } from '@/app/api/volcengine/service';

export class VolcengineProcessor implements IImageProcessor {
  constructor(private config: VolcengineConfig) {}

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    return await enhanceWithVolcengine(
      userId,
      imageBase64,
      params?.resolutionBoundary,
      params?.enableHdr,
      params?.enableWb,
      params?.resultFormat,
      params?.jpgQuality
    );
  }

  async outpaint(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    return await outpaintWithVolcengine(
      userId,
      imageBase64,
      params?.prompt,
      params?.top,
      params?.bottom,
      params?.left,
      params?.right,
      params?.maxHeight,
      params?.maxWidth
    );
  }
}
