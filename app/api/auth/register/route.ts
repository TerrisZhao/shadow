import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { users } from "@/lib/db/schema";

/**
 * 用户注册 API
 * 用于创建邮箱密码账号（供移动端使用）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 },
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 个字符" },
        { status: 400 },
      );
    }

    // 检查邮箱是否已存在
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "该邮箱已被注册" }, { status: 409 });
    }

    // 加密密码
    const passwordHash = await hash(password, 10);

    // 创建用户
    const newUser = await db
      .insert(users)
      .values({
        email,
        name: name || null,
        passwordHash,
        provider: "credentials",
        role: "user",
        isActive: true,
        emailVerified: true, // 移动端注册直接验证
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
      });

    if (newUser.length === 0) {
      return NextResponse.json({ error: "创建用户失败" }, { status: 500 });
    }

    return NextResponse.json({
      message: "注册成功",
      user: newUser[0],
    });
  } catch (error) {
    console.error("Register error:", error);

    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 },
    );
  }
}
