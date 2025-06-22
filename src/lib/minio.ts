import { Client } from 'minio';

// MinIO客户端配置
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

const bucketName = process.env.MINIO_BUCKET_NAME || 'imagine-this';

// 确保存储桶存在
export async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      // console.log(`Created bucket: ${bucketName}`);
    }
  } catch (error) {
    // console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}

// 上传图片到MinIO
export async function uploadImageToMinio(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  try {
    await ensureBucketExists();
    
    const objectName = `images/${Date.now()}-${filename}`;
    
    await minioClient.putObject(
      bucketName,
      objectName,
      imageBuffer,
      imageBuffer.length,
      {
        'Content-Type': contentType,
        'Cache-Control': 'max-age=31536000', // 1年缓存
      }
    );
    
    // 返回可访问的URL (7天有效期，MinIO最大限制)
    const url = await minioClient.presignedGetObject(bucketName, objectName, 7 * 24 * 60 * 60); // 7天有效期
    return url;
  } catch (error) {
    // console.error('Error uploading to MinIO:', error);
    throw error;
  }
}

// 从base64上传图片
export async function uploadBase64ImageToMinio(
  base64Data: string,
  filename: string
): Promise<string> {
  try {
    // 移除data:image/jpeg;base64,前缀
    const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64String, 'base64');
    
    return await uploadImageToMinio(imageBuffer, filename);
  } catch (error) {
    // console.error('Error uploading base64 image to MinIO:', error);
    throw error;
  }
}

// 删除MinIO中的图片
export async function deleteImageFromMinio(objectName: string): Promise<void> {
  try {
    await minioClient.removeObject(bucketName, objectName);
  } catch (error) {
    // console.error('Error deleting from MinIO:', error);
    throw error;
  }
}

// 生成缩略图并上传
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    // 这里可以使用sharp库生成缩略图
    // 暂时直接使用原图
    const thumbnailName = `thumbnail-${filename}`;
    return await uploadImageToMinio(originalImageBuffer, thumbnailName);
  } catch (error) {
    // console.error('Error generating thumbnail:', error);
    throw error;
  }
}

export { minioClient, bucketName };
