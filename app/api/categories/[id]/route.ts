import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { categories, users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 获取当前用户 ID 和 role（支持移动端 x-user-id header 和网页端 session）
async function resolveUser(
  request: NextRequest,
): Promise<{ userId: string; role: string | undefined } | null> {
  const fromHeader = request.headers.get("x-user-id");

  if (fromHeader) {
    const userRecord = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, parseInt(fromHeader)))
      .limit(1);

    return { userId: fromHeader, role: userRecord[0]?.role ?? undefined };
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) return null;

  return {
    userId: session.user.id,
    role: (session.user as any)?.role ?? undefined,
  };
}

// 编辑分类
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const categoryId = parseInt(resolvedParams.id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的分类ID" }, { status: 400 });
    }

    const body = await request.json();
    const { name, color, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "分类名称是必填项" }, { status: 400 });
    }

    const currentUserId = parseInt(user.userId);
    const isAdmin = user.role === "admin" || user.role === "owner";

    // 查找分类，确认存在且未被删除
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    const category = existing[0];

    // 预设分类只有 admin/owner 可以编辑
    if (category.isPreset && !isAdmin) {
      return NextResponse.json(
        { error: "预设分类不能编辑" },
        { status: 403 },
      );
    }

    // 非预设分类只有所有者或 admin/owner 可以编辑
    if (!category.isPreset && category.userId !== currentUserId && !isAdmin) {
      return NextResponse.json(
        { error: "无权限编辑此分类" },
        { status: 403 },
      );
    }

    const updated = await db
      .update(categories)
      .set({
        name: name.trim(),
        color: color || category.color,
        description: description?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId))
      .returning();

    return NextResponse.json({
      message: "分类更新成功",
      category: updated[0],
    });
  } catch (error) {
    return NextResponse.json({ error: "更新分类失败" }, { status: 500 });
  }
}

// 删除分类（软删除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await resolveUser(request);

    if (!user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const categoryId = parseInt(resolvedParams.id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: "无效的分类ID" }, { status: 400 });
    }

    const currentUserId = parseInt(user.userId);
    const isAdmin = user.role === "admin" || user.role === "owner";

    // 查找分类，确认存在且未被删除
    const existing = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, categoryId), isNull(categories.deletedAt)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "分类不存在" }, { status: 404 });
    }

    const category = existing[0];

    // 预设分类只有 admin/owner 可以删除
    if (category.isPreset && !isAdmin) {
      return NextResponse.json(
        { error: "预设分类不能删除" },
        { status: 403 },
      );
    }

    // 非预设分类只有所有者或 admin/owner 可以删除
    if (!category.isPreset && category.userId !== currentUserId && !isAdmin) {
      return NextResponse.json(
        { error: "无权限删除此分类" },
        { status: 403 },
      );
    }

    await db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(eq(categories.id, categoryId));

    return NextResponse.json({ message: "分类删除成功" });
  } catch (error) {
    return NextResponse.json({ error: "删除分类失败" }, { status: 500 });
  }
}
