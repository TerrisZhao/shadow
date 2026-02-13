import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, or, and, desc, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { categories, users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 获取分类列表
export async function GET(request: NextRequest) {
  try {
    // 尝试从 headers 获取（移动端）
    let userIdStr = request.headers.get("x-user-id");

    // 如果没有，尝试从 session 获取（网页端）
    if (!userIdStr) {
      const session = await getServerSession(authOptions);

      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 获取管理员用户ID列表
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ["admin", "owner"]));

    const adminUserIds = adminUsers.map((user: { id: any }) => user.id);
    const currentUserId = parseInt(userIdStr);

    // 获取预设分类、当前用户自定义分类和管理员创建的分类（排除软删除）
    const result = await db
      .select()
      .from(categories)
      .where(
        and(
          isNull(categories.deletedAt),
          or(
            eq(categories.isPreset, true),
            eq(categories.userId, currentUserId),
            and(
              inArray(categories.userId, adminUserIds),
              eq(categories.isPreset, false),
            ),
          ),
        ),
      )
      .orderBy(desc(categories.isPreset), desc(categories.createdAt));

    return NextResponse.json({ categories: result });
  } catch (error) {
    return NextResponse.json({ error: "获取分类列表失败" }, { status: 500 });
  }
}

// 创建新分类
export async function POST(request: NextRequest) {
  try {
    // 尝试从 headers 获取（移动端）
    let userIdStr = request.headers.get("x-user-id");

    // 如果没有，尝试从 session 获取（网页端）
    if (!userIdStr) {
      const session = await getServerSession(authOptions);

      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "分类名称是必填项" }, { status: 400 });
    }

    const currentUserId = parseInt(userIdStr);

    // 检查分类名称唯一性
    // 1. 预设分类的名称全局唯一
    const presetCategory = await db
      .select()
      .from(categories)
      .where(
        and(eq(categories.name, name.trim()), eq(categories.isPreset, true)),
      )
      .limit(1);

    if (presetCategory.length > 0) {
      return NextResponse.json(
        { error: "该分类名称已被预设分类使用" },
        { status: 400 },
      );
    }

    // 2. 用户自定义分类在用户范围内唯一
    const userCategory = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.name, name.trim()),
          eq(categories.userId, currentUserId),
          eq(categories.isPreset, false),
        ),
      )
      .limit(1);

    if (userCategory.length > 0) {
      return NextResponse.json(
        { error: "您已经创建过同名的自定义分类" },
        { status: 400 },
      );
    }

    // 创建分类
    const newCategory = await db
      .insert(categories)
      .values({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#3b82f6",
        isPreset: false,
        userId: currentUserId,
      })
      .returning();

    return NextResponse.json({
      message: "分类创建成功",
      category: newCategory[0],
    });
  } catch (error) {
    return NextResponse.json({ error: "创建分类失败" }, { status: 500 });
  }
}

// 删除分类（软删除）
export async function DELETE(request: NextRequest) {
  try {
    let userIdStr = request.headers.get("x-user-id");

    if (!userIdStr) {
      const session = await getServerSession(authOptions);
      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("id");

    if (!categoryId) {
      return NextResponse.json({ error: "分类 ID 是必填项" }, { status: 400 });
    }

    const currentUserId = parseInt(userIdStr);
    const id = parseInt(categoryId);

    // 查找分类，确认存在且未被删除
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), isNull(categories.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    const category = existing[0];

    // 预设分类不允许删除
    if (category.isPreset) {
      return NextResponse.json(
        { error: "预设分类不能删除" },
        { status: 403 },
      );
    }

    // 只有分类所有者可以删除
    if (category.userId !== currentUserId) {
      return NextResponse.json({ error: "无权限删除此分类" }, { status: 403 });
    }

    await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, id));

    return NextResponse.json({ message: "分类删除成功" });
  } catch (error) {
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  }
}
