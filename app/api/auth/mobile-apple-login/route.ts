import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { SignJWT, importX509, createRemoteJWKSet, jwtVerify } from "jose";

import { db } from "@/lib/db/drizzle";
import { users, loginHistory } from "@/lib/db/schema";
import { parseUserAgent } from "@/lib/utils/device-parser";

const APPLE_JWKS_URL = new URL("https://appleid.apple.com/auth/keys");
const appleJWKS = createRemoteJWKSet(APPLE_JWKS_URL);

/**
 * 移动端 Apple 登录 API
 * 为 iOS 应用提供 Apple Sign-In 认证
 * 验证 Apple identity token 并查找/创建用户
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identityToken, name, email: clientEmail } = body;

    if (!identityToken) {
      return NextResponse.json(
        { error: "Apple Identity Token 不能为空" },
        { status: 400 },
      );
    }

    // 验证 Apple Identity Token
    let appleUser;
    try {
      const { payload } = await jwtVerify(identityToken, appleJWKS, {
        issuer: "https://appleid.apple.com",
        audience: process.env.APPLE_BUNDLE_ID || "men.terriszhao.shadow",
      });

      appleUser = {
        appleId: payload.sub as string,
        email: (payload.email as string) || clientEmail,
        emailVerified: payload.email_verified as boolean,
        name: name || null,
      };
    } catch (error) {
      console.error("Apple token verification failed:", error);
      return NextResponse.json(
        { error: "Apple 登录验证失败" },
        { status: 401 },
      );
    }

    if (!appleUser.email) {
      return NextResponse.json(
        { error: "无法获取 Apple 账号邮箱" },
        { status: 400 },
      );
    }

    // 查找或创建用户
    let user;
    const existingUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.email, appleUser.email), isNull(users.deletedAt)))
      .limit(1);

    if (existingUsers.length > 0) {
      user = existingUsers[0];

      // 如果用户存在但没有 Apple provider，更新用户信息
      if (user.provider !== "apple") {
        await db
          .update(users)
          .set({
            provider: "apple",
            providerId: appleUser.appleId,
            emailVerified: appleUser.emailVerified ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));
      }
    } else {
      // 创建新用户
      const newUsers = await db
        .insert(users)
        .values({
          email: appleUser.email,
          name: appleUser.name,
          provider: "apple",
          providerId: appleUser.appleId,
          emailVerified: appleUser.emailVerified ? new Date() : null,
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
      .setExpirationTime("30d")
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
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Mobile Apple login error:", error);

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
