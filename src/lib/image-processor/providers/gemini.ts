/**
 * Gemini 图片处理器（预留）
 */

import { IImageProcessor, ProcessResult, GeminiConfig } from '../types';

export class GeminiProcessor implements IImageProcessor {
  constructor(private config: GeminiConfig) {}

  async generate(userId: string, params: any): Promise<ProcessResult> {
    throw new Error('Gemini not implemented yet');
  }
}
