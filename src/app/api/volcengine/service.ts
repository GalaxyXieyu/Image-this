/**
 * 兼容旧 Volcengine API 路由的服务入口。
 * 具体实现已统一迁移到 AI MediaKit Bearer API。
 */

export {
  enhanceWithVolcengine,
  outpaintWithVolcengine,
} from '@/lib/image-processor/service';
