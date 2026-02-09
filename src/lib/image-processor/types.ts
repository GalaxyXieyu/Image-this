/**
 * 图片处理服务统一类型定义
 */

export enum ImageProvider {
  VOLCENGINE = 'volcengine',
  GPT = 'gpt',
  GEMINI = 'gemini',
  QWEN = 'qwen',
  JIMENG = 'jimeng',
  JIMENG45 = 'jimeng45',
}

export enum ProcessType {
  ENHANCE = 'enhance',
  OUTPAINT = 'outpaint',
  BACKGROUND_REPLACE = 'background_replace',
  GENERATE = 'generate',
}

export interface VolcengineConfig {
  enabled: boolean;
  accessKey: string;
  secretKey: string;
}

export interface GPTConfig {
  enabled: boolean;
  apiUrl: string;
  apiKey: string;
}

export interface GeminiConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl?: string;
}

export interface QwenConfig {
  enabled: boolean;
  apiKey: string;
}

export interface Jimeng45Config {
  enabled: boolean;
  arkApiKey: string;
}

export interface ProvidersConfig {
  volcengine: VolcengineConfig;
  gpt: GPTConfig;
  gemini: GeminiConfig;
  qwen: QwenConfig;
  jimeng: VolcengineConfig; // Jimeng 使用火山引擎配置
  jimeng45?: Jimeng45Config; // Jimeng 4.5 使用 Ark API
}

export interface ProcessResult {
  id: string;
  imageData: string;
  imageSize: number;
  processedUrl?: string;
  metadata?: Record<string, any>;
}

export interface IImageProcessor {
  enhance?(userId: string, imageBase64: string, params?: any): Promise<ProcessResult>;
  outpaint?(userId: string, imageBase64: string, params?: any): Promise<ProcessResult>;
  backgroundReplace?(userId: string, params: any): Promise<ProcessResult>;
  generate?(userId: string, params: any): Promise<ProcessResult>;
}
