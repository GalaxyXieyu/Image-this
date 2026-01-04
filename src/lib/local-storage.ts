import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * 获取默认上传目录
 * 在 Electron 环境中使用用户数据目录，在 Web 环境中使用 public/uploads
 */
function getDefaultUploadDir(): string {
  // 检查是否在 Electron 环境中（通过环境变量或路径判断）
  const cwd = process.cwd();
  const isElectronPackaged = cwd.includes('app.asar') || 
                              cwd.includes('AppData') || 
                              cwd.includes('Temp') ||
                              process.env.ELECTRON_RUN_AS_NODE;
  
  if (isElectronPackaged) {
    // Electron 打包环境：使用用户主目录下的应用数据目录
    const appDataDir = path.join(os.homedir(), 'ImagineThis', 'uploads');
    return appDataDir;
  }
  
  // 开发环境或 Web 环境：使用 public/uploads
  return path.join(process.cwd(), 'public', 'uploads');
}

// 默认上传目录
const DEFAULT_UPLOAD_DIR = getDefaultUploadDir();

/**
 * 获取上传目录路径
 * @param customPath 用户自定义路径（可选）
 * @returns 实际使用的上传目录路径
 */
export function getUploadDir(customPath?: string | null): string {
  if (customPath) {
    // 支持 ~ 符号表示用户主目录
    if (customPath.startsWith('~')) {
      return path.join(os.homedir(), customPath.slice(1));
    }
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(customPath)) {
      return customPath;
    }
    // 相对路径，相对于项目根目录
    return path.join(process.cwd(), customPath);
  }
  return DEFAULT_UPLOAD_DIR;
}

/**
 * 确保上传目录存在
 * @param customPath 用户自定义路径（可选）
 */
export async function ensureUploadDirExists(customPath?: string | null) {
  const uploadDir = getUploadDir(customPath);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
}

/**
 * 上传图片到本地
 * @param imageBuffer 图片Buffer
 * @param filename 文件名
 * @param contentType 内容类型
 * @param customPath 用户自定义路径（可选）
 * @returns 图片URL路径
 */
export async function uploadImageToLocal(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg',
  customPath?: string | null
): Promise<string> {
  const uploadDir = await ensureUploadDirExists(customPath);
  
  const sanitizedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const filePath = path.join(uploadDir, sanitizedFilename);
  
  await fs.writeFile(filePath, imageBuffer);
  
  // 检查是否在 Electron 环境中
  const cwd = process.cwd();
  const isElectronPackaged = cwd.includes('app.asar') || 
                              cwd.includes('AppData') || 
                              cwd.includes('Temp') ||
                              process.env.ELECTRON_RUN_AS_NODE;
  
  if (isElectronPackaged) {
    // Electron 环境：返回 API 路径，通过 /api/files/ 提供文件访问
    // 根据实际保存目录构建 API 路径
    if (customPath) {
      // 如果是自定义路径，需要构建相对路径
      // 例如：自定义路径是 D:/MyImages，则 API 路径是 /api/files/MyImages/xxx.jpg
      const pathSegments = uploadDir.split(path.sep);
      const uploadsIndex = pathSegments.lastIndexOf('uploads');
      
      if (uploadsIndex !== -1) {
        // 如果路径中包含 uploads，取 uploads 之后的部分
        const relativeSegments = pathSegments.slice(uploadsIndex + 1);
        const relativePath = relativeSegments.join('/');
        return `/api/files/${relativePath}/${sanitizedFilename}`;
      } else {
        // 如果路径中不包含 uploads，使用完整目录名作为路径
        const dirName = path.basename(uploadDir);
        return `/api/files/${dirName}/${sanitizedFilename}`;
      }
    } else {
      // 默认路径
      return `/api/files/uploads/${sanitizedFilename}`;
    }
  }
  
  // Web 环境：如果使用默认路径（public/uploads），返回可访问的URL路径
  // 如果使用自定义路径，返回完整文件路径
  if (!customPath || uploadDir === DEFAULT_UPLOAD_DIR) {
    return `/uploads/${sanitizedFilename}`;
  }
  return filePath;
}

/**
 * 从base64上传图片或视频
 * @param base64Data Base64数据
 * @param filename 文件名
 * @param customPath 用户自定义路径（可选）
 * @returns 文件URL路径
 */
export async function uploadBase64ImageToLocal(
  base64Data: string,
  filename: string,
  customPath?: string | null
): Promise<string> {
  // 移除data:image/xxx;base64, 或 data:video/xxx;base64, 前缀
  const base64String = base64Data.replace(/^data:(image|video)\/[a-z0-9]+;base64,/i, '');
  const buffer = Buffer.from(base64String, 'base64');

  // 根据文件名判断内容类型
  const ext = filename.split('.').pop()?.toLowerCase();
  const contentType = ext === 'mp4' ? 'video/mp4' : 'image/jpeg';

  return await uploadImageToLocal(buffer, filename, contentType, customPath);
}

/**
 * 删除本地图片
 * @param urlPath 图片URL路径或完整文件路径
 * @param customPath 用户自定义路径（可选）
 */
export async function deleteImageFromLocal(
  urlPath: string,
  customPath?: string | null
): Promise<void> {
  try {
    let filePath: string;
    
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(urlPath)) {
      filePath = urlPath;
    } else {
      // 从URL路径提取文件名
      const filename = path.basename(urlPath);
      const uploadDir = getUploadDir(customPath);
      filePath = path.join(uploadDir, filename);
    }
    
    await fs.unlink(filePath);
  } catch (error) {
    // 文件可能已经不存在，忽略错误
  }
}

/**
 * 生成缩略图并上传（暂时直接使用原图）
 * @param originalImageBuffer 原图Buffer
 * @param filename 文件名
 * @param customPath 用户自定义路径（可选）
 * @returns 缩略图URL路径
 */
export async function generateAndUploadThumbnail(
  originalImageBuffer: Buffer,
  filename: string,
  customPath?: string | null
): Promise<string> {
  const thumbnailName = `thumbnail-${filename}`;
  return await uploadImageToLocal(originalImageBuffer, thumbnailName, 'image/jpeg', customPath);
}

/**
 * 检查本地图片文件是否存在
 * @param urlPath 图片URL路径或完整文件路径
 * @param customPath 用户自定义路径（可选）
 * @returns 文件是否存在
 */
export async function checkImageExists(
  urlPath: string,
  customPath?: string | null
): Promise<boolean> {
  if (!urlPath) return false;
  
  // 清理路径中可能的空白字符
  const cleanUrl = urlPath.trim();
  
  // 跳过非本地路径（如 http:// 或 https://）
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    return true; // 假设远程URL存在，不做验证
  }
  
  try {
    let filePath: string;
    
    // 检查是否在 Electron 环境
    const cwd = process.cwd();
    const isElectronPackaged = cwd.includes('app.asar') || 
                                cwd.includes('AppData') || 
                                cwd.includes('Temp') ||
                                process.env.ELECTRON_RUN_AS_NODE;
    
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(cleanUrl)) {
      filePath = cleanUrl;
    } else if (cleanUrl.startsWith('/api/files/')) {
      // API 路径格式：/api/files/uploads/xxx.jpg
      const relativePath = cleanUrl.replace('/api/files/', '');
      
      if (isElectronPackaged) {
        if (customPath) {
          const uploadDir = getUploadDir(customPath);
          const filename = path.basename(relativePath);
          filePath = path.join(uploadDir, filename);
        } else {
          // 默认 Electron 路径
          filePath = path.join(os.homedir(), 'ImagineThis', relativePath);
        }
      } else {
        // Web 环境：/api/files/uploads/xxx.jpg -> public/uploads/xxx.jpg
        filePath = path.join(process.cwd(), 'public', relativePath);
      }
    } else if (cleanUrl.startsWith('/uploads/')) {
      // Web 环境路径格式：/uploads/xxx.jpg -> public/uploads/xxx.jpg
      filePath = path.join(process.cwd(), 'public', cleanUrl.substring(1)); // 移除开头的 /
    } else if (cleanUrl.startsWith('uploads/')) {
      // 相对路径格式：uploads/xxx.jpg -> public/uploads/xxx.jpg
      filePath = path.join(process.cwd(), 'public', cleanUrl);
    } else {
      // 其他路径，尝试从自定义目录或默认目录查找
      const filename = path.basename(cleanUrl);
      const uploadDir = getUploadDir(customPath);
      filePath = path.join(uploadDir, filename);
    }
    
    await fs.access(filePath);
    return true;
  } catch (error) {
    // 文件不存在或无法访问
    return false;
  }
}
