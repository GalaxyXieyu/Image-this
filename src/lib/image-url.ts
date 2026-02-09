/**
 * 统一规范图片 URL，避免部署环境中 /uploads 静态路径不可用导致加载失败。
 */
export function normalizeImageUrlForClient(url?: string | null): string | null {
  if (!url) return null;

  const cleanUrl = url.trim();
  if (!cleanUrl) return null;

  // 旧数据使用 /uploads/xxx，统一走 /api/files 以兼容不同部署方式
  if (cleanUrl.startsWith('/uploads/')) {
    return `/api/files${cleanUrl}`;
  }

  if (cleanUrl.startsWith('uploads/')) {
    return `/api/files/${cleanUrl}`;
  }

  return cleanUrl;
}
