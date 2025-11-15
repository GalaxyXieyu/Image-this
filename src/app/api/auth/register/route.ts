import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// 注册验证 schema
const registerSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要6个字符'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证输入数据
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: '输入数据验证失败', 
          details: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { name, email, password } = validationResult.data;

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: user,
      message: '注册成功'
    });

  } catch (error) {
    console.error('=== 注册错误 ===');
    console.error('详细错误信息:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}