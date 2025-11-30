import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 验证用户信息更新的请求体
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "姓名不能为空")
    .max(255, "姓名长度不能超过255个字符")
    .optional(),
  themeMode: z.enum(["light", "dark", "system"]).optional(),
});

/**
 * 获取用户个人信息
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        themeMode: users.themeMode,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(
        and(eq(users.id, parseInt(session.user.id)), isNull(users.deletedAt)),
      )
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ user: user[0] });
  } catch (error) {
    console.error("获取用户信息失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

/**
 * 更新用户个人信息
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // 构建更新数据
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }

    if (validatedData.themeMode !== undefined) {
      updateData.themeMode = validatedData.themeMode;
    }

    // 更新用户信息
    const result = await db
      .update(users)
      .set(updateData)
      .where(
        and(eq(users.id, parseInt(session.user.id)), isNull(users.deletedAt)),
      )
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
        themeMode: users.themeMode,
        updatedAt: users.updatedAt,
      });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "用户不存在或更新失败" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "个人信息更新成功",
      user: result[0],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "请求数据格式错误", details: error.issues },
        { status: 400 },
      );
    }

    console.error("更新用户信息失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
