import type { NextRequest } from 'next/server';

/**
 * 构造指向本服务 worker 接口的「内部」URL。
 *
 * 为什么不用 request.url：生产环境前置 nginx 做 TLS 终止，所有 http 请求 301 跳转到 https。
 * 若用 request.url（公网 http 地址）发起自调用，fetch 跟随 301 会把 POST 降级为 GET，
 * 导致 worker 只返回状态、不处理任务，新任务永远卡在 PENDING。
 *
 * 这里改用 127.0.0.1 回环 + 实际监听端口，直连本进程、绕过反代与重定向，
 * 在本地开发和生产环境都稳定可用。
 */
export function getInternalWorkerUrl(request: NextRequest): string {
  const port = process.env.PORT || new URL(request.url).port || '3000';
  return `http://127.0.0.1:${port}/api/tasks/worker`;
}
