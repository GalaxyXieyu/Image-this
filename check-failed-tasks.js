const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkFailedTasks() {
  try {
    console.log('正在查看失败的任务...\n');

    // 查看最近的失败任务
    const failedTasks = await prisma.taskQueue.findMany({
      where: {
        status: 'FAILED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    if (failedTasks.length === 0) {
      console.log('没有找到失败的任务');
    } else {
      console.log(`找到 ${failedTasks.length} 个失败的任务:\n`);
      
      failedTasks.forEach((task, index) => {
        console.log(`=== 任务 ${index + 1} ===`);
        console.log('ID:', task.id);
        console.log('类型:', task.type);
        console.log('状态:', task.status);
        console.log('当前步骤:', task.currentStep);
        console.log('错误信息:', task.errorMessage);
        console.log('创建时间:', task.createdAt);
        console.log('开始时间:', task.startedAt);
        console.log('完成时间:', task.completedAt);
        console.log('输入数据:', task.inputData);
        console.log('进度:', task.progress);
        console.log('完成步骤:', task.completedSteps);
        console.log('');
      });
    }

    // 查看正在处理的任务
    const processingTasks = await prisma.taskQueue.findMany({
      where: {
        status: 'PROCESSING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (processingTasks.length > 0) {
      console.log(`\n正在处理的任务 (${processingTasks.length} 个):`);
      processingTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.type} - ${task.currentStep} (${task.progress}%)`);
      });
    }

    // 查看待处理的任务
    const pendingTasks = await prisma.taskQueue.findMany({
      where: {
        status: 'PENDING'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (pendingTasks.length > 0) {
      console.log(`\n待处理的任务 (${pendingTasks.length} 个):`);
      pendingTasks.forEach((task, index) => {
        console.log(`${index + 1}. ${task.type} - 创建于 ${task.createdAt}`);
      });
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFailedTasks(); 