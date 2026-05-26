import { useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

type InputAssetRef = {
  assetId: string;
  filePath: string;
  clientUrl: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
  name: string;
}

interface UseImageProcessingProps {
  uploadedImages: UploadedImage[];
  referenceImage: UploadedImage | null;
  watermarkLogo: UploadedImage | null;
  watermarkSettings: any;
  outputResolution: string;
  aiModel?: string;
  backgroundPrompt?: string;
  outpaintPrompt?: string;
  oneClickBackgroundPrompt?: string;
  oneClickOutpaintPrompt?: string;
  enableOneClickOutpaint?: boolean;
  // 视频生成相关
  enableVideo?: boolean;
  videoPrompt?: string;
  videoFrames?: number;
  videoAspectRatio?: string;
}

export function useImageProcessing({
  uploadedImages,
  referenceImage,
  watermarkLogo,
  watermarkSettings,
  outputResolution,
  aiModel = 'gemini',
  backgroundPrompt = '',
  outpaintPrompt = '',
  oneClickBackgroundPrompt = '',
  oneClickOutpaintPrompt = '',
  enableOneClickOutpaint = true,
  // 视频生成相关
  enableVideo = false,
  videoPrompt = '',
  videoFrames = 121,
  videoAspectRatio = '16:9'
}: UseImageProcessingProps) {
  const { toast } = useToast();

  const createInputAssets = useCallback(async ({
    input,
    reference,
    watermarkLogo,
  }: {
    input?: File;
    reference?: File | null;
    watermarkLogo?: File | null;
  }): Promise<{
    inputAsset?: InputAssetRef;
    referenceAsset?: InputAssetRef;
    watermarkLogoAsset?: InputAssetRef;
  }> => {
    const formData = new FormData();

    if (input) {
      formData.append('input', input);
    }
    if (reference) {
      formData.append('reference', reference);
    }
    if (watermarkLogo) {
      formData.append('watermarkLogo', watermarkLogo);
    }

    const response = await fetch('/api/input-assets', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || '创建输入资产失败');
    }

    return response.json();
  }, []);

  // 调整图片尺寸以符合API要求
  const resizeImageForAPI = useCallback((imageDataUrl: string, mimeType?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        const minSize = 512;
        const maxSize = 2048;
        const targetSize = 1024;

        let { width, height } = img;

        if (width < minSize || height < minSize) {
          const scale = targetSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        width = Math.round(width / 8) * 8;
        height = Math.round(height / 8) * 8;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // 检测原始图片格式，保持 PNG 透明度
        // 优先使用传入的 mimeType，其次检测 data URL 前缀
        const isPNG = mimeType 
          ? mimeType === 'image/png'
          : imageDataUrl.startsWith('data:image/png');
        
        console.log('[resizeImageForAPI] 输入格式检测:', {
          isPNG,
          mimeType,
          inputPrefix: imageDataUrl.substring(0, 50),
          originalSize: { width: img.width, height: img.height },
          resizedSize: { width, height }
        });
        
        const resizedDataUrl = isPNG 
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', 0.9);
        
        console.log('[resizeImageForAPI] 输出格式:', {
          outputPrefix: resizedDataUrl.substring(0, 30),
          outputFormat: isPNG ? 'PNG' : 'JPEG'
        });
        
        resolve(resizedDataUrl);
      };

      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };

      img.src = imageDataUrl;
    });
  }, []);

  // 批量创建任务的通用函数
  const createBatchTasks = useCallback(async (taskType: string, taskData: Record<string, unknown>[]) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData.map(data => ({
          type: taskType,
          inputData: JSON.stringify(data),
          priority: 1,
          totalSteps: taskType === 'ONE_CLICK_WORKFLOW' ? 3 : 1
        }))),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`创建任务失败: ${errorData.details || response.statusText}`);
      }

      const result = await response.json();
      return result.tasks;
    } catch (error) {
      console.error('创建批量任务失败:', error);
      throw error;
    }
  }, []);

  // 触发后台任务处理器
  const triggerWorker = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/worker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch: true }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData?.details || errorData?.error || errorMessage;
        } catch {
          // ignore json parse failure
        }
        console.error('[Worker] 任务处理器触发失败:', errorMessage);
        toast({
          title: '任务已入队，但后台处理器启动失败',
          description: `请在任务中心手动重试或稍后再试：${errorMessage}`,
          variant: 'destructive',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('[Worker] 触发任务处理器失败:', error);
      toast({
        title: '任务已入队，但后台处理器启动失败',
        description: error instanceof Error ? error.message : '无法连接后台处理器，请稍后重试',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  // 图像扩展处理
  const handleExpansion = useCallback(async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const { inputAsset } = await createInputAssets({ input: image.file });
      if (!inputAsset) {
        throw new Error('输入资产创建失败');
      }

      taskData.push({
        inputAsset,
        xScale,
        yScale,
        prompt: outpaintPrompt,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('IMAGE_EXPANSION', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, outpaintPrompt, createBatchTasks, triggerWorker, createInputAssets]);

  // 图像高清化处理
  const handleUpscaling = useCallback(async () => {
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const { inputAsset } = await createInputAssets({ input: image.file });
      if (!inputAsset) {
        throw new Error('输入资产创建失败');
      }

      taskData.push({
        inputAsset,
        upscaleFactor,
        aiModel,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('IMAGE_UPSCALING', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, aiModel, createBatchTasks, triggerWorker, createInputAssets]);

  // 一键增强处理
  const handleOneClick = useCallback(async (
    enableWatermark: boolean,
    watermarkText: string,
    watermarkOpacity: number,
    watermarkPosition: any,
    watermarkType: 'text' | 'logo'
  ) => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    let watermarkLogoAsset: InputAssetRef | undefined;
    let watermarkPositionData: any = watermarkPosition;

    if (enableWatermark && watermarkType === 'logo' && watermarkLogo) {
      const assets = await createInputAssets({ watermarkLogo: watermarkLogo.file });
      watermarkLogoAsset = assets.watermarkLogoAsset;
      watermarkPositionData = watermarkSettings;
    }

    const taskData = [];
    
    // 处理参考图（只处理一次）
    let referenceAsset: InputAssetRef | undefined;
    if (referenceImage) {
      const assets = await createInputAssets({ reference: referenceImage.file });
      referenceAsset = assets.referenceAsset;
    }
    
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const { inputAsset } = await createInputAssets({ input: image.file });
      if (!inputAsset) {
        throw new Error('输入资产创建失败');
      }

      taskData.push({
        inputAsset,
        referenceAsset,
        xScale,
        yScale,
        upscaleFactor,
        enableBackgroundReplace: !!referenceImage,
        enableOutpaint: enableOneClickOutpaint,
        enableUpscale: true,
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition: watermarkPositionData,
        watermarkType,
        watermarkLogoAsset,
        outputResolution,
        aiModel,
        backgroundPrompt: oneClickBackgroundPrompt,
        outpaintPrompt: oneClickOutpaintPrompt,
        // 视频生成相关
        enableVideo,
        videoPrompt,
        videoFrames,
        videoAspectRatio,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('ONE_CLICK_WORKFLOW', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, referenceImage, watermarkLogo, watermarkSettings, outputResolution, aiModel, oneClickBackgroundPrompt, oneClickOutpaintPrompt, enableOneClickOutpaint, enableVideo, videoPrompt, videoFrames, videoAspectRatio, createBatchTasks, triggerWorker, createInputAssets]);

  // 背景替换处理
  const handleBackgroundReplace = useCallback(async () => {
    if (!referenceImage) {
      throw new Error('背景替换需要参考图片');
    }

    const customPrompt = backgroundPrompt;

    // 先处理参考图（只处理一次）
    const referenceAssets = await createInputAssets({ reference: referenceImage.file });
    const referenceAsset = referenceAssets.referenceAsset;
    if (!referenceAsset) {
      throw new Error('参考图资产创建失败');
    }

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const { inputAsset } = await createInputAssets({ input: image.file });
      if (!inputAsset) {
        throw new Error('输入资产创建失败');
      }

      taskData.push({
        inputAsset,
        referenceAsset,
        customPrompt: customPrompt,
        aiModel,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('BACKGROUND_REMOVAL', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, referenceImage, aiModel, backgroundPrompt, createBatchTasks, triggerWorker, createInputAssets]);

  // 水印处理
  const handleWatermark = useCallback(async () => {
    if (!watermarkLogo) {
      throw new Error('请先上传Logo图片');
    }

    const taskData = [];
    const logoAssets = await createInputAssets({ watermarkLogo: watermarkLogo.file });
    const watermarkLogoAsset = logoAssets.watermarkLogoAsset;
    if (!watermarkLogoAsset) {
      throw new Error('Logo 资产创建失败');
    }

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const { inputAsset } = await createInputAssets({ input: image.file });
      if (!inputAsset) {
        throw new Error('输入资产创建失败');
      }

      taskData.push({
        inputAsset,
        watermarkType: 'logo',
        watermarkLogoAsset,
        watermarkPosition: watermarkSettings,
        watermarkOpacity: 1.0,
        outputResolution,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('WATERMARK', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, watermarkLogo, watermarkSettings, outputResolution, createBatchTasks, triggerWorker, createInputAssets]);

  return {
    handleExpansion,
    handleUpscaling,
    handleOneClick,
    handleBackgroundReplace,
    handleWatermark,
  };
}
