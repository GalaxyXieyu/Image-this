/**
 * GPT 图片处理器
 */

import { IImageProcessor, ProcessResult, GPTConfig } from '../types';

export class GPTProcessor implements IImageProcessor {
  constructor(private config: GPTConfig) {}

  async backgroundReplace(userId: string, params: any): Promise<ProcessResult> {
    // 实现 GPT 背景替换逻辑
    throw new Error('GPT background replace not implemented yet');
  }

  async generate(userId: string, params: any): Promise<ProcessResult> {
    // 实现 GPT 图片生成逻辑
    throw new Error('GPT generate not implemented yet');
  }
}
