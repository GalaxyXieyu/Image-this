import sharp from 'sharp';

/**
 * 裁切图片，去除上下左右的指定百分比
 * @param imageBuffer 图片Buffer
 * @param cropPercentage 裁切百分比 (0-1)，默认0.1 (10%)
 * @returns 裁切后的图片Buffer
 */
export async function cropImageBorders(
  imageBuffer: Buffer, 
  cropPercentage: number = 0.1
): Promise<Buffer> {
  try {
    // 获取图片信息
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('无法获取图片尺寸');
    }

    // 计算裁切区域
    const cropWidth = Math.floor(metadata.width * (1 - 2 * cropPercentage));
    const cropHeight = Math.floor(metadata.height * (1 - 2 * cropPercentage));
    const left = Math.floor(metadata.width * cropPercentage);
    const top = Math.floor(metadata.height * cropPercentage);

    // 执行裁切
    const croppedBuffer = await image
      .extract({
        left: left,
        top: top,
        width: cropWidth,
        height: cropHeight
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    return croppedBuffer;
  } catch (error) {
    console.error('图片裁切失败:', error);
    throw new Error('图片裁切失败');
  }
}

/**
 * 裁切base64格式的图片
 * @param base64Data base64图片数据
 * @param cropPercentage 裁切百分比 (0-1)，默认0.1 (10%)
 * @returns 裁切后的base64数据
 */
export async function cropBase64Image(
  base64Data: string, 
  cropPercentage: number = 0.1
): Promise<string> {
  try {
    // 移除data:image前缀
    let base64String = base64Data;
    if (base64Data.startsWith('data:')) {
      base64String = base64Data.split(',')[1];
    }

    // 转换为Buffer
    const imageBuffer = Buffer.from(base64String, 'base64');
    
    // 裁切图片
    const croppedBuffer = await cropImageBorders(imageBuffer, cropPercentage);
    
    // 转换回base64
    const croppedBase64 = croppedBuffer.toString('base64');
    return `data:image/jpeg;base64,${croppedBase64}`;
  } catch (error) {
    console.error('Base64图片裁切失败:', error);
    throw new Error('Base64图片裁切失败');
  }
}

/**
 * 裁切URL图片
 * @param imageUrl 图片URL
 * @param cropPercentage 裁切百分比 (0-1)，默认0.1 (10%)
 * @returns 裁切后的base64数据
 */
export async function cropUrlImage(
  imageUrl: string, 
  cropPercentage: number = 0.1
): Promise<string> {
  try {
    // 下载图片
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // 裁切图片
    const croppedBuffer = await cropImageBorders(imageBuffer, cropPercentage);
    
    // 转换为base64
    const croppedBase64 = croppedBuffer.toString('base64');
    return `data:image/jpeg;base64,${croppedBase64}`;
  } catch (error) {
    console.error('URL图片裁切失败:', error);
    throw new Error('URL图片裁切失败');
  }
}

/**
 * 智能裁切图片 (自动判断输入格式)
 * @param imageInput 图片输入 (base64或URL)
 * @param cropPercentage 裁切百分比 (0-1)，默认0.1 (10%)
 * @returns 裁切后的base64数据
 */
export async function cropImage(
  imageInput: string, 
  cropPercentage: number = 0.1
): Promise<string> {
  if (imageInput.startsWith('data:') || (!imageInput.startsWith('http') && !imageInput.startsWith('/'))) {
    // Base64格式
    return await cropBase64Image(imageInput, cropPercentage);
  } else {
    // URL格式
    return await cropUrlImage(imageInput, cropPercentage);
  }
}
