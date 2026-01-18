import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { SignJWT } from "jose";
import { OAuth2Client } from "google-auth-library";

import { db } from "@/lib/db/drizzle";
import { users, loginHistory } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/utils/device-parser";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * 移动端 Google 登录 API
 * 为 iOS/Android 应用提供 Google OAuth 认证
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "Google ID Token 不能为空" },
        { status: 400 },
      );
    }

    // 验证 Google ID Token
    let googleUser;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
        return NextResponse.json(
          { error: "无效的 Google Token" },
          { status: 401 },
        );
      }

      googleUser = {
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        emailVerified: payload.email_verified,
      };
    } catch (error) {
      console.error("Google token verification failed:", error);
      return NextResponse.json(
        { error: "Google 登录验证失败" },
        { status: 401 },
      );
    }

    if (!googleUser.email) {
      return NextResponse.json(
        { error: "无法获取 Google 账号邮箱" },
        { status: 400 },
      );
    }

    // 查找或创建用户
    let user;
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.email, googleUser.email), isNull(users.deletedAt)))
      .limit(1);

    if (existingUsers.length > 0) {
      user = existingUsers[0];

      // 如果用户存在但没有 Google provider，更新用户信息
      if (user.provider !== "google") {
        await db
          .update(users)
          .set({
            provider: "google",
            providerId: googleUser.googleId,
            emailVerified: googleUser.emailVerified ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
    } else {
      // 创建新用户
      const newUsers = await db
        .insert(users)
        .values({
          email: googleUser.email,
          name: googleUser.name || null,
          provider: "google",
          providerId: googleUser.googleId,
          emailVerified: googleUser.emailVerified ? new Date() : null,
          role: "user",
          isActive: true,
        })
        .returning();

      user = newUsers[0];
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
    console.error("Mobile Google login error:", error);

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
