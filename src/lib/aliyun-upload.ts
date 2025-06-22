interface AliyunUploadPolicy {
  policy: string;
  signature: string;
  upload_dir: string;
  upload_host: string;
  expire_in_seconds: number;
  max_file_size_mb: number;
  capacity_limit_mb: number;
  oss_access_key_id: string;
  x_oss_object_acl: string;
  x_oss_forbid_overwrite: string;
}

interface AliyunUploadResponse {
  request_id: string;
  data: AliyunUploadPolicy;
}

/**
 * 获取阿里云文件上传凭证
 * @param apiKey 阿里云API Key
 * @param modelName 模型名称，如 'wanx2.1-imageedit'
 * @returns 上传凭证信息
 */
export async function getAliyunUploadPolicy(
  apiKey: string, 
  modelName: string
): Promise<AliyunUploadPolicy> {
  const url = 'https://dashscope.aliyuncs.com/api/v1/uploads';
  const params = new URLSearchParams({
    action: 'getPolicy',
    model: modelName
  });

  const response = await fetch(`${url}?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`获取上传凭证失败 (${response.status}): ${errorText}`);
  }

  const result: AliyunUploadResponse = await response.json();
  return result.data;
}

/**
 * 上传文件到阿里云OSS临时存储
 * @param policyData 上传凭证
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @returns OSS URL (oss://格式)
 */
export async function uploadFileToAliyunOSS(
  policyData: AliyunUploadPolicy,
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const key = `${policyData.upload_dir}/${filename}`;
  
  // 创建FormData
  const formData = new FormData();
  formData.append('OSSAccessKeyId', policyData.oss_access_key_id);
  formData.append('Signature', policyData.signature);
  formData.append('policy', policyData.policy);
  formData.append('x-oss-object-acl', policyData.x_oss_object_acl);
  formData.append('x-oss-forbid-overwrite', policyData.x_oss_forbid_overwrite);
  formData.append('key', key);
  formData.append('success_action_status', '200');
  
  // 添加文件
  const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
  formData.append('file', blob, filename);

  const response = await fetch(policyData.upload_host, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`文件上传失败 (${response.status}): ${errorText}`);
  }

  return `oss://${key}`;
}

/**
 * 上传Base64图片到阿里云并获取OSS URL
 * @param apiKey 阿里云API Key
 * @param modelName 模型名称
 * @param base64Data Base64图片数据 (可包含data:前缀)
 * @param filename 文件名
 * @returns OSS URL (oss://格式)
 */
export async function uploadBase64ToAliyun(
  apiKey: string,
  modelName: string,
  base64Data: string,
  filename?: string
): Promise<string> {
  // 1. 获取上传凭证
  const policyData = await getAliyunUploadPolicy(apiKey, modelName);
  
  // 2. 处理base64数据
  let base64String = base64Data;
  if (base64Data.startsWith('data:')) {
    base64String = base64Data.split(',')[1];
  }
  
  const imageBuffer = Buffer.from(base64String, 'base64');
  
  // 3. 生成文件名
  const finalFilename = filename || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
  
  // 4. 上传文件
  return await uploadFileToAliyunOSS(policyData, imageBuffer, finalFilename);
}

/**
 * 上传URL图片到阿里云并获取OSS URL
 * @param apiKey 阿里云API Key
 * @param modelName 模型名称
 * @param imageUrl 图片URL
 * @param filename 文件名
 * @returns OSS URL (oss://格式)
 */
export async function uploadUrlToAliyun(
  apiKey: string,
  modelName: string,
  imageUrl: string,
  filename?: string
): Promise<string> {
  // 1. 下载图片
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`下载图片失败: ${response.statusText}`);
  }
  
  const imageBuffer = Buffer.from(await response.arrayBuffer());
  
  // 2. 获取上传凭证
  const policyData = await getAliyunUploadPolicy(apiKey, modelName);
  
  // 3. 生成文件名
  const finalFilename = filename || `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
  
  // 4. 上传文件
  return await uploadFileToAliyunOSS(policyData, imageBuffer, finalFilename);
}

/**
 * 智能上传图片到阿里云 (自动判断输入格式)
 * @param apiKey 阿里云API Key
 * @param modelName 模型名称
 * @param imageInput 图片输入 (base64或URL)
 * @param filename 文件名
 * @returns OSS URL (oss://格式)
 */
export async function uploadImageToAliyun(
  apiKey: string,
  modelName: string,
  imageInput: string,
  filename?: string
): Promise<string> {
  if (imageInput.startsWith('data:') || (!imageInput.startsWith('http') && !imageInput.startsWith('/'))) {
    // Base64格式
    return await uploadBase64ToAliyun(apiKey, modelName, imageInput, filename);
  } else {
    // URL格式
    return await uploadUrlToAliyun(apiKey, modelName, imageInput, filename);
  }
}
