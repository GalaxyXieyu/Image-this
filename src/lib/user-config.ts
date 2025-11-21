/**
 * 用户配置管理
 * 从数据库获取用户的 API 配置
 */

import { prisma } from '@/lib/prisma';

export interface UserConfig {
  volcengine?: {
    accessKey: string;
    secretKey: string;
  };
  imagehosting?: {
    superbedToken: string;
  };
}

/**
 * 获取用户配置
 * @param userId 用户ID
 * @returns 用户配置
 */
export async function getUserConfig(userId: string): Promise<UserConfig> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      volcengineAccessKey: true,
      volcengineSecretKey: true,
      superbedToken: true,
    }
  });

  if (!user) {
    throw new Error('用户不存在');
  }

  const config: UserConfig = {};

  // 火山引擎配置
  if (user.volcengineAccessKey && user.volcengineSecretKey) {
    config.volcengine = {
      accessKey: user.volcengineAccessKey,
      secretKey: user.volcengineSecretKey,
    };
  }

  // 图床配置
  if (user.superbedToken) {
    config.imagehosting = {
      superbedToken: user.superbedToken,
    };
  }

  return config;
}

/**
 * 保存用户配置
 * @param userId 用户ID
 * @param config 配置对象
 */
export async function saveUserConfig(userId: string, config: UserConfig): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      volcengineAccessKey: config.volcengine?.accessKey || null,
      volcengineSecretKey: config.volcengine?.secretKey || null,
      superbedToken: config.imagehosting?.superbedToken || null,
    }
  });
}
