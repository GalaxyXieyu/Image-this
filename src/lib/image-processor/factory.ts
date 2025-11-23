/**
 * 图片处理器工厂
 */

import { ImageProvider, IImageProcessor, ProvidersConfig } from './types';
import { VolcengineProcessor } from './providers/volcengine';
import { GPTProcessor } from './providers/gpt';
import { GeminiProcessor } from './providers/gemini';
import { QwenProcessor } from './providers/qwen';
import { JimengProcessor } from './providers/jimeng';

export class ImageProcessorFactory {
  private static processors: Map<ImageProvider, IImageProcessor> = new Map();
  private static config: ProvidersConfig;

  static initialize(config: ProvidersConfig) {
    this.config = config;
    
    if (config.volcengine.enabled) {
      this.processors.set(ImageProvider.VOLCENGINE, new VolcengineProcessor(config.volcengine));
    }
    
    if (config.gpt.enabled) {
      this.processors.set(ImageProvider.GPT, new GPTProcessor(config.gpt));
    }
    
    if (config.gemini.enabled) {
      this.processors.set(ImageProvider.GEMINI, new GeminiProcessor(config.gemini));
    }
    
    if (config.qwen.enabled) {
      this.processors.set(ImageProvider.QWEN, new QwenProcessor(config.qwen));
    }
    
    if (config.jimeng.enabled) {
      this.processors.set(ImageProvider.JIMENG, new JimengProcessor(config.jimeng));
    }
  }

  static getProcessor(provider: ImageProvider): IImageProcessor {
    const processor = this.processors.get(provider);
    if (!processor) {
      throw new Error(`Provider ${provider} not initialized or not enabled`);
    }
    return processor;
  }

  static getAvailableProviders(): ImageProvider[] {
    return Array.from(this.processors.keys());
  }
}
