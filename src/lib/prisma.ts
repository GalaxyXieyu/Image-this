import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaConnected: boolean | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// 预连接数据库 - 减少首次查询延迟
if (!globalForPrisma.prismaConnected) {
  globalForPrisma.prismaConnected = true;
  // 异步预热连接，不阻塞模块加载
  prisma.$connect()
    .then(async () => {
      console.log('[Prisma] Database connection established');
      
      // SQLite WAL 模式优化 - 显著提升 Windows 上的并发读写性能
      // 使用 $queryRawUnsafe 因为 PRAGMA 语句会返回结果
      try {
        await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
        await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
        await prisma.$queryRawUnsafe('PRAGMA cache_size = 10000;');
        await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
        console.log('[Prisma] SQLite WAL mode enabled for better performance');
      } catch (e) {
        console.warn('[Prisma] Failed to enable WAL mode:', e);
      }
    })
    .catch((e) => {
      console.error('[Prisma] Failed to connect:', e);
      globalForPrisma.prismaConnected = false;
    });
}

// 优雅关闭连接
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;