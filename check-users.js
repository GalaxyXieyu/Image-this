const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('正在查看数据库中的用户...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      },
      take: 5
    });

    if (users.length === 0) {
      console.log('没有找到用户');
    } else {
      console.log(`找到 ${users.length} 个用户:\n`);
      
      users.forEach((user, index) => {
        console.log(`=== 用户 ${index + 1} ===`);
        console.log('ID:', user.id);
        console.log('邮箱:', user.email);
        console.log('姓名:', user.name);
        console.log('创建时间:', user.createdAt);
        console.log('');
      });
    }
  } catch (error) {
    console.error('查看用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers(); 