/**
 * Input validation helpers for workflow handlers.
 *
 * Uses TypeScript narrowing (not a heavy validation library).
 * Each function validates raw parsed input and throws a descriptive
 * error if the shape doesn't match expectations.
 */

import type {
  BackgroundReplaceParams,
  WatermarkParams,
  UpscaleParams,
  OutpaintParams,
  OneClickParams,
  VideoParams,
  InputAssetRef,
} from '@/types/workbench';

// ---------------------------------------------------------------------------
// Asset reference validation
// ---------------------------------------------------------------------------

export function validateInputAssetRef(raw: unknown): InputAssetRef {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected InputAssetRef object');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.assetId !== 'string') {
    throw new Error('InputAssetRef.assetId must be a string');
  }

  return {
    assetId: obj.assetId,
    filePath: typeof obj.filePath === 'string' ? obj.filePath : '',
    clientUrl: typeof obj.clientUrl === 'string' ? obj.clientUrl : '',
    originalFilename: typeof obj.originalFilename === 'string' ? obj.originalFilename : '',
    mimeType: typeof obj.mimeType === 'string' ? obj.mimeType : '',
    sizeBytes: typeof obj.sizeBytes === 'number' ? obj.sizeBytes : 0,
  };
}

// ---------------------------------------------------------------------------
// Tool parameter validations
// ---------------------------------------------------------------------------

export function validateBackgroundReplaceParams(raw: unknown): BackgroundReplaceParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected BackgroundReplaceParams object');
  }
  const obj = raw as Record<string, unknown>;

  return {
    prompt: typeof obj.prompt === 'string' ? obj.prompt : '',
    referenceAsset: obj.referenceAsset ? validateInputAssetRef(obj.referenceAsset) : undefined,
    aiModel: typeof obj.aiModel === 'string' ? obj.aiModel : 'default',
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '1024x1024',
  };
}

export function validateWatermarkParams(raw: unknown): WatermarkParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected WatermarkParams object');
  }
  const obj = raw as Record<string, unknown>;

  const position = obj.watermarkPosition;
  const validPosition =
    position === 'top-left' ||
    position === 'top-right' ||
    position === 'bottom-left' ||
    position === 'bottom-right' ||
    position === 'center'
      ? position
      : 'bottom-right';

  const type = obj.watermarkType;
  const validType = type === 'logo' ? 'logo' : 'text';

  return {
    watermarkType: validType,
    watermarkText: typeof obj.watermarkText === 'string' ? obj.watermarkText : '',
    watermarkLogoAsset: obj.watermarkLogoAsset ? validateInputAssetRef(obj.watermarkLogoAsset) : undefined,
    watermarkOpacity: typeof obj.watermarkOpacity === 'number' ? obj.watermarkOpacity : 50,
    watermarkPosition: validPosition,
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '1024x1024',
  };
}

export function validateUpscaleParams(raw: unknown): UpscaleParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected UpscaleParams object');
  }
  const obj = raw as Record<string, unknown>;

  return {
    upscaleFactor: typeof obj.upscaleFactor === 'number' ? obj.upscaleFactor : 2,
    aiModel: typeof obj.aiModel === 'string' ? obj.aiModel : 'default',
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '1024x1024',
  };
}

export function validateOutpaintParams(raw: unknown): OutpaintParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected OutpaintParams object');
  }
  const obj = raw as Record<string, unknown>;

  return {
    xScale: typeof obj.xScale === 'number' ? obj.xScale : 1.5,
    yScale: typeof obj.yScale === 'number' ? obj.yScale : 1.5,
    prompt: typeof obj.prompt === 'string' ? obj.prompt : '',
    aiModel: typeof obj.aiModel === 'string' ? obj.aiModel : 'default',
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '1024x1024',
  };
}

export function validateOneClickParams(raw: unknown): OneClickParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected OneClickParams object');
  }
  const obj = raw as Record<string, unknown>;

  return {
    enableBackgroundReplace: typeof obj.enableBackgroundReplace === 'boolean' ? obj.enableBackgroundReplace : true,
    enableOutpaint: typeof obj.enableOutpaint === 'boolean' ? obj.enableOutpaint : false,
    enableUpscale: typeof obj.enableUpscale === 'boolean' ? obj.enableUpscale : false,
    enableWatermark: typeof obj.enableWatermark === 'boolean' ? obj.enableWatermark : false,
    backgroundPrompt: typeof obj.backgroundPrompt === 'string' ? obj.backgroundPrompt : '',
    outpaintPrompt: typeof obj.outpaintPrompt === 'string' ? obj.outpaintPrompt : '',
    xScale: typeof obj.xScale === 'number' ? obj.xScale : 1.5,
    yScale: typeof obj.yScale === 'number' ? obj.yScale : 1.5,
    upscaleFactor: typeof obj.upscaleFactor === 'number' ? obj.upscaleFactor : 2,
    watermarkParams: obj.watermarkParams ? validateWatermarkParams(obj.watermarkParams) : undefined,
    aiModel: typeof obj.aiModel === 'string' ? obj.aiModel : 'default',
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '1024x1024',
  };
}

export function validateVideoParams(raw: unknown): VideoParams {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Expected VideoParams object');
  }
  const obj = raw as Record<string, unknown>;

  return {
    aiModel: typeof obj.aiModel === 'string' ? obj.aiModel : 'default',
    outputResolution: typeof obj.outputResolution === 'string' ? obj.outputResolution : '720p',
  };
}

/**
 * Validate parsed task inputData and extract parameters.
 * Returns the full parsed object and the validated parameters.
 */
export function validateTaskInput(raw: unknown): {
  parsed: Record<string, unknown>;
  parameters: Record<string, unknown>;
  inputAsset?: InputAssetRef;
} {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Task inputData must be a JSON object');
  }

  const parsed = raw as Record<string, unknown>;

  const parameters = parsed.parameters && typeof parsed.parameters === 'object'
    ? (parsed.parameters as Record<string, unknown>)
    : parsed;

  const inputAsset = parsed.inputAsset
    ? validateInputAssetRef(parsed.inputAsset)
    : undefined;

  return { parsed, parameters, inputAsset };
}
