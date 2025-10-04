import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/drizzle';
import { categories, users } from '@/lib/db/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/config';

// 获取分类列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取管理员用户ID列表
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['admin', 'owner']));
    
    const adminUserIds = adminUsers.map(user => user.id);
    const currentUserId = parseInt(session.user.id);
    
    // 获取预设分类、当前用户自定义分类和管理员创建的分类
    const result = await db
      .select()
      .from(categories)
      .where(
        or(
          eq(categories.isPreset, true),
          eq(categories.userId, currentUserId),
          inArray(categories.userId, adminUserIds)
        )
      )
      .orderBy(desc(categories.isPreset), desc(categories.createdAt));

    return NextResponse.json({ categories: result });
  } catch (error) {
    console.error('获取分类列表失败:', error);
    return NextResponse.json(
      { error: '获取分类列表失败' },
      { status: 500 }
    );
  }
}

// 创建新分类
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name) {
      return NextResponse.json(
        { error: '分类名称是必填项' },
        { status: 400 }
      );
    }

    // 检查分类名称是否已存在
    const existingCategory = await db
      .select()
      .from(categories)
      .where(eq(categories.name, name))
      .limit(1);

    if (existingCategory.length > 0) {
      return NextResponse.json(
        { error: '分类名称已存在' },
        { status: 400 }
      );
    }

    const newCategory = await db
      .insert(categories)
      .values({
        name,
        description: description || null,
        color: color || '#3b82f6',
        isPreset: false,
        userId: parseInt(session.user.id),
      })
      .returning();

    return NextResponse.json({
      message: '分类创建成功',
      category: newCategory[0],
    });
  } catch (error) {
    console.error('创建分类失败:', error);
    return NextResponse.json(
      { error: '创建分类失败' },
      { status: 500 }
    );
  }
}
