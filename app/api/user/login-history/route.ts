import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, desc } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { loginHistory } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * 获取用户登录历史
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // 获取登录历史记录
    const history = await db
      .select({
        id: loginHistory.id,
        ipAddress: loginHistory.ipAddress,
        userAgent: loginHistory.userAgent,
        deviceType: loginHistory.deviceType,
        browser: loginHistory.browser,
        os: loginHistory.os,
        location: loginHistory.location,
        isSuccessful: loginHistory.isSuccessful,
        failureReason: loginHistory.failureReason,
        createdAt: loginHistory.createdAt,
      })
      .from(loginHistory)
      .where(eq(loginHistory.userId, parseInt(session.user.id)))
      .orderBy(desc(loginHistory.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const totalResult = await db
      .select({ count: loginHistory.id })
      .from(loginHistory)
      .where(eq(loginHistory.userId, parseInt(session.user.id)));

    const total = totalResult.length;

    return NextResponse.json({
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("获取登录历史失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
