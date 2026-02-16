import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, gte, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { practiceLogs } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * GET /api/practice/daily-count
 * 返回近 21 天每天的练习句子数（含补零，固定返回 21 条）
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

    const now = new Date();
    // 21 天前的 0 时
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 20);
    startDate.setHours(0, 0, 0, 0);

    const rows = await db
      .select({
        date: sql<string>`TO_CHAR(${practiceLogs.practicedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`COUNT(*)`,
      })
      .from(practiceLogs)
      .where(
        and(
          eq(practiceLogs.userId, currentUserId),
          gte(practiceLogs.practicedAt, startDate),
        ),
      )
      .groupBy(sql`TO_CHAR(${practiceLogs.practicedAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`);

    // 建立日期 → 数量的 map
    const countMap = new Map<string, number>();
    for (const row of rows) {
      countMap.set(row.date, Number(row.count));
    }

    // 补零：生成完整 21 天数组
    const data: { date: string; count: number }[] = [];
    for (let i = 20; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
      data.push({ date: dateStr, count: countMap.get(dateStr) ?? 0 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("获取每日练习数量失败:", error);
    return NextResponse.json({ error: "获取每日练习数量失败" }, { status: 500 });
  }
}
