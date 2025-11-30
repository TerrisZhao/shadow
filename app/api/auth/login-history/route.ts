import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db/drizzle";
import { loginHistory } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";
import { parseUserAgent, getClientIP } from "@/lib/utils/device-parser";

/**
 * 记录登录历史
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { userAgent, ipAddress } = await request.json();

    // 解析用户代理
    const { deviceType, browser, os } = parseUserAgent(userAgent || "Unknown");

    // 记录登录历史
    await db.insert(loginHistory).values({
      userId: parseInt(session.user.id),
      ipAddress: ipAddress || getClientIP(request),
      userAgent: userAgent || "Unknown",
      deviceType,
      browser,
      os,
      isSuccessful: true,
    });

    return NextResponse.json({ message: "登录历史记录成功" });
  } catch (error) {
    console.error("记录登录历史失败:", error);

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
