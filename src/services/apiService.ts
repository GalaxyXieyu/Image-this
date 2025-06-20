
interface GPTImageGenerationRequest {
  model: string;
  messages: Array<{
    role: string;
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;
  }>;
  seed: number;
}

interface QwenOutpaintingRequest {
  model: string;
  input: {
    image_url: string;
  };
  parameters: {
    x_scale: number;
    y_scale: number;
    best_quality: boolean;
    limit_image_size: boolean;
  };
}

interface QwenUpscaleRequest {
  model: string;
  input: {
    function: string;
    prompt: string;
    base_image_url: string;
  };
  parameters: {
    upscale_factor: number;
    n: number;
  };
}

export class APIService {
  private gptApiUrl: string;
  private gptApiKey: string;
  private qwenApiKey: string;
  private tempFileServerUrl: string;

  constructor(config: {
    gptApiUrl: string;
    gptApiKey: string;
    qwenApiKey: string;
    tempFileServerUrl?: string;
  }) {
    this.gptApiUrl = config.gptApiUrl;
    this.gptApiKey = config.gptApiKey;
    this.qwenApiKey = config.qwenApiKey;
    this.tempFileServerUrl = config.tempFileServerUrl || '';
  }

  // GPT-4o 图像生成
  async generateImageWithGPT(
    referenceImage: File,
    prompt: string,
    model: string = 'gpt-4o',
    seed: number = Math.floor(Math.random() * 1000000)
  ): Promise<Blob> {
    const base64Image = await this.fileToBase64(referenceImage);
    
    const request: GPTImageGenerationRequest = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Create image ${prompt}` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      seed
    };

    const response = await fetch(this.gptApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.gptApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`GPT API Error: ${response.statusText}`);
    }

    const result = await response.json();
    // 处理响应中的图像数据（URL或Base64）
    return this.processImageResponse(result);
  }

  // 通义千问图像扩图
  async outpaintImage(
    image: File,
    xScale: number = 2.0,
    yScale: number = 2.0,
    useBase64: boolean = true
  ): Promise<Blob> {
    const imageUrl = useBase64 
      ? `data:image/jpeg;base64,${await this.fileToBase64(image)}`
      : await this.uploadToTempServer(image);

    const request: QwenOutpaintingRequest = {
      model: 'image-out-painting',
      input: {
        image_url: imageUrl
      },
      parameters: {
        x_scale: xScale,
        y_scale: yScale,
        best_quality: false,
        limit_image_size: true
      }
    };

    // 提交任务
    const submitResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/out-painting',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.qwenApiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(request)
      }
    );

    if (!submitResponse.ok) {
      throw new Error(`Qwen Outpainting Submit Error: ${submitResponse.statusText}`);
    }

    const { task_id } = await submitResponse.json();
    
    // 轮询任务结果
    return this.pollTaskResult(task_id);
  }

  // 通义千问高清放大
  async upscaleImage(
    image: File,
    upscaleFactor: number = 2,
    useBase64: boolean = true
  ): Promise<Blob> {
    const imageUrl = useBase64 
      ? `data:image/jpeg;base64,${await this.fileToBase64(image)}`
      : await this.uploadToTempServer(image);

    const request: QwenUpscaleRequest = {
      model: 'wanx2.1-imageedit',
      input: {
        function: 'super_resolution',
        prompt: '图像超分。',
        base_image_url: imageUrl
      },
      parameters: {
        upscale_factor: upscaleFactor,
        n: 1
      }
    };

    // 提交任务
    const submitResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.qwenApiKey}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: JSON.stringify(request)
      }
    );

    if (!submitResponse.ok) {
      throw new Error(`Qwen Upscale Submit Error: ${submitResponse.statusText}`);
    }

    const { task_id } = await submitResponse.json();
    
    // 轮询任务结果
    return this.pollTaskResult(task_id, 'upscale');
  }

  // 轮询任务结果
  private async pollTaskResult(taskId: string, type: 'outpaint' | 'upscale' = 'outpaint'): Promise<Blob> {
    const maxAttempts = 30;
    const pollInterval = 2000; // 2秒

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.qwenApiKey}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Task polling error: ${response.statusText}`);
      }

      const result = await response.json();
      const status = result.output.task_status;

      if (status === 'FAILED') {
        throw new Error('Task failed');
      }

      if (status === 'SUCCEEDED') {
        let imageUrl: string;
        
        if (type === 'upscale') {
          imageUrl = result.output.results[0].url;
        } else {
          imageUrl = result.output.output_image_url;
        }

        // 下载最终图像
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error('Failed to download result image');
        }
        
        return imageResponse.blob();
      }

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Task timeout');
  }

  // 工具方法
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async uploadToTempServer(file: File): Promise<string> {
    if (!this.tempFileServerUrl) {
      throw new Error('Temp file server URL not configured');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(this.tempFileServerUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload to temp server');
    }

    const result = await response.json();
    return result.url;
  }

  private async processImageResponse(response: any): Promise<Blob> {
    // 根据实际API响应格式处理图像数据
    // 这里需要根据您的具体API响应格式来实现
    console.log('Processing GPT image response:', response);
    throw new Error('GPT image response processing not implemented');
  }
}
