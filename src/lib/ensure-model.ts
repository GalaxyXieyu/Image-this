/**
 * 生成前置检查：用户是否已配置至少一个可用的「生图模型」。
 * 没配 key 时任务会卡住/无明确报错，前端应在提交前拦截并提示去设置配置。
 */
export async function hasEnabledImageModel(): Promise<boolean> {
  try {
    const res = await fetch("/api/models/available");
    if (!res.ok) return true; // 检查失败时不阻断，交由后端处理，避免误拦
    const data = await res.json();
    return Array.isArray(data.models) && data.models.length > 0;
  } catch {
    return true; // 网络异常不阻断
  }
}
