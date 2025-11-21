import { PROCESS_TYPE_NAMES } from './constants';

export function getProcessTypeName(type: string): string {
  return PROCESS_TYPE_NAMES[type] || type;
}

export function resizeImageForAPI(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const maxWidth = 2048;
      const maxHeight = 2048;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = Math.round(width / aspectRatio);
        } else {
          height = maxHeight;
          width = Math.round(height * aspectRatio);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建canvas上下文'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = imageDataUrl;
  });
}

export async function createBatchTasks(
  taskType: string, 
  taskData: Record<string, unknown>[]
): Promise<{ taskIds: string[] }> {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tasks: taskData.map(data => ({
        type: taskType,
        ...data,
      })),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '创建任务失败');
  }

  return response.json();
}

export async function triggerWorker(): Promise<void> {
  try {
    const response = await fetch('/api/workflow/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('触发任务处理器失败');
    }
  } catch (error) {
    console.error('触发 Worker 失败:', error);
    throw error;
  }
}
