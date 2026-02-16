import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, gte, lt, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { practiceLogs } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * GET /api/practice/calendar
 * 返回指定年月内有练习记录的日期列表
 * Query params: year, month（默认当月）
 */
export async function GET(request: NextRequest) {
  try {
    let userIdStr = request.headers.get("x-user-id");

    if (!userIdStr) {
      const session = await getServerSession(authOptions);
      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const currentUserId = parseInt(userIdStr);
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));
    const rawOffset = parseInt(searchParams.get("utcOffset") ?? "0");
    const utcOffset = isNaN(rawOffset) || rawOffset < -840 || rawOffset > 840 ? 0 : rawOffset;

    // 月份 UTC 范围：本地零点对应的 UTC 时刻
    const startDate = new Date(Date.UTC(year, month - 1, 1) - utcOffset * 60 * 1000);
    const endDate = new Date(Date.UTC(year, month, 1) - utcOffset * 60 * 1000);

    const rows = await db
      .selectDistinct({
        date: sql<string>`TO_CHAR(${practiceLogs.practicedAt} + (${sql.raw(String(utcOffset))} * INTERVAL '1 minute'), 'YYYY-MM-DD')`,
      })
      .from(practiceLogs)
      .where(
        and(
          eq(practiceLogs.userId, currentUserId),
          gte(practiceLogs.practicedAt, startDate),
          lt(practiceLogs.practicedAt, endDate),
        ),
      );

    const dates = rows.map((r: { date: string }) => r.date);

    return NextResponse.json({ dates });
  } catch (error) {
    console.error("获取练习日历失败:", error);
    return NextResponse.json({ error: "获取练习日历失败" }, { status: 500 });
  }
}
