import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { compare } from "bcryptjs";
import { SignJWT } from "jose";

import { db } from "@/lib/db/drizzle";
import { users, loginHistory } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/utils/device-parser";

/**
 * 移动端登录 API
 * 为 iOS/Android 应用提供 JWT token 认证
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "邮箱和密码不能为空" },
        { status: 400 },
      );
    }

    // 查询用户
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const user = result[0];

    // 验证密码
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "该账号未设置密码，请使用第三方登录" },
        { status: 401 },
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // 记录失败的登录尝试
      await recordLoginHistory(
        user.id,
        request.headers.get("user-agent") || "Unknown",
        getClientIP(request),
        false,
        "密码错误",
      );

      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return NextResponse.json({ error: "账号已被禁用" }, { status: 403 });
    }

    // 生成 JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "your-secret-key-change-this",
    );

    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") // 30天有效期
      .sign(secret);

    // 记录成功的登录
    await recordLoginHistory(
      user.id,
      request.headers.get("user-agent") || "Unknown",
      getClientIP(request),
      true,
    );

    // 返回用户信息和 token
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (error) {
    console.error("Mobile login error:", error);

    return NextResponse.json(
      { error: "登录失败，请稍后重试" },
      { status: 500 },
    );
  }
}

/**
 * 记录登录历史
 */
async function recordLoginHistory(
  userId: number,
  userAgent: string,
  ipAddress: string | null,
  isSuccessful: boolean = true,
  failureReason?: string,
) {
  try {
    const { deviceType, browser, os } = parseUserAgent(userAgent);

    await db.insert(loginHistory).values({
      userId,
      ipAddress,
      userAgent,
      deviceType,
      browser,
      os,
      isSuccessful,
      failureReason,
    });
  } catch (error) {
    console.error("记录登录历史失败:", error);
  }
}

/**
 * 获取客户端 IP 地址
 */
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) return forwarded.split(",")[0].trim();

  return null;
}
