#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const testUserId = 'test-user-123';
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { id: testUserId }
    });

    if (user) {
      console.log(`✓ 测试用户已存在: ${testUserId}`);
    } else {
      user = await prisma.user.create({
        data: {
          id: testUserId,
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: new Date()
        }
      });
      console.log(`✓ 创建测试用户成功: ${testUserId}`);
    }

    console.log(`\n用户信息:`);
    console.log(`- ID: ${user.id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.name}`);
    console.log(`\n✅ 完成！现在可以运行测试了`);

  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
