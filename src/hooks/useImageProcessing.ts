import { useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

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
}

export function useImageProcessing({
  uploadedImages,
  referenceImage,
  watermarkLogo,
  watermarkSettings,
  outputResolution
}: UseImageProcessingProps) {
  const { toast } = useToast();

  // 调整图片尺寸以符合API要求
  const resizeImageForAPI = useCallback((imageDataUrl: string): Promise<string> => {
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

        const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
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
        console.error('[Worker] 任务处理器触发失败:', response.status);
      }
    } catch (error) {
      console.error('[Worker] 触发任务处理器失败:', error);
    }
  }, []);

  // 图像扩展处理
  const handleExpansion = useCallback(async () => {
    const xScale = parseFloat((document.getElementById('xScale') as HTMLInputElement)?.value || '2.0');
    const yScale = parseFloat((document.getElementById('yScale') as HTMLInputElement)?.value || '2.0');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);

      taskData.push({
        imageUrl: resizedImageUrl,
        xScale,
        yScale,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('IMAGE_EXPANSION', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, resizeImageForAPI, createBatchTasks, triggerWorker]);

  // 图像高清化处理
  const handleUpscaling = useCallback(async () => {
    const upscaleFactor = parseInt((document.getElementById('upscaleFactor') as HTMLInputElement)?.value || '2');

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);

      taskData.push({
        imageUrl: resizedImageUrl,
        upscaleFactor,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('IMAGE_UPSCALING', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, resizeImageForAPI, createBatchTasks, triggerWorker]);

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

    let watermarkLogoData: string | undefined;
    let watermarkPositionData: any = watermarkPosition;

    if (enableWatermark && watermarkType === 'logo' && watermarkLogo) {
      watermarkLogoData = await resizeImageForAPI(watermarkLogo.preview);
      watermarkPositionData = watermarkSettings;
    }

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);

      let resizedReferenceUrl = undefined;
      if (referenceImage) {
        resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);
      }

      taskData.push({
        imageUrl: resizedImageUrl,
        referenceImageUrl: resizedReferenceUrl,
        xScale,
        yScale,
        upscaleFactor,
        enableBackgroundReplace: !!referenceImage,
        enableOutpaint: true,
        enableUpscale: true,
        enableWatermark,
        watermarkText,
        watermarkOpacity,
        watermarkPosition: watermarkPositionData,
        watermarkType,
        watermarkLogoUrl: watermarkLogoData,
        outputResolution,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('ONE_CLICK_WORKFLOW', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, referenceImage, watermarkLogo, watermarkSettings, outputResolution, resizeImageForAPI, createBatchTasks, triggerWorker]);

  // 背景替换处理
  const handleBackgroundReplace = useCallback(async () => {
    if (!referenceImage) {
      throw new Error('背景替换需要参考图片');
    }

    const customPrompt = (document.getElementById('customPrompt') as HTMLTextAreaElement)?.value || '';

    const taskData = [];
    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedOriginalUrl = await resizeImageForAPI(image.preview);
      const resizedReferenceUrl = await resizeImageForAPI(referenceImage.preview);

      taskData.push({
        imageUrl: resizedOriginalUrl,
        referenceImageUrl: resizedReferenceUrl,
        customPrompt: customPrompt,
        originalImageId: image.id,
        originalImageName: image.name
      });
    }

    const tasks = await createBatchTasks('BACKGROUND_REMOVAL', taskData);
    await triggerWorker();
    return tasks;
  }, [uploadedImages, referenceImage, resizeImageForAPI, createBatchTasks, triggerWorker]);

  // 水印处理
  const handleWatermark = useCallback(async () => {
    if (!watermarkLogo) {
      throw new Error('请先上传Logo图片');
    }

    const taskData = [];
    const watermarkLogoData = await resizeImageForAPI(watermarkLogo.preview);

    for (let i = 0; i < uploadedImages.length; i++) {
      const image = uploadedImages[i];
      const resizedImageUrl = await resizeImageForAPI(image.preview);

      taskData.push({
        imageUrl: resizedImageUrl,
        watermarkType: 'logo',
        watermarkLogoUrl: watermarkLogoData,
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
  }, [uploadedImages, watermarkLogo, watermarkSettings, outputResolution, resizeImageForAPI, createBatchTasks, triggerWorker]);

  return {
    handleExpansion,
    handleUpscaling,
    handleOneClick,
    handleBackgroundReplace,
    handleWatermark,
  };
}
