/**
 * Gemini 图片处理器（预留）
 */

import { IImageProcessor, ProcessResult, GeminiConfig } from '../types';

export class GeminiProcessor implements IImageProcessor {
  constructor(private config: GeminiConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    // TODO: 实现 Gemini 背景替换逻辑
    throw new Error('Gemini background replace not implemented yet');
  }

  async enhance(userId: string, imageBase64: string, params?: any): Promise<ProcessResult> {
    // TODO: 实现 Gemini 画质增强逻辑
    throw new Error('Gemini enhance not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    // TODO: 实现 Gemini 图片生成逻辑
    throw new Error('Gemini generate not implemented yet');
  }
}
