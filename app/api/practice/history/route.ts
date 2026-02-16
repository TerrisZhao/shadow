import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, gte, lt, eq, desc, sql } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { practiceLogs, sentences, categories } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * GET /api/practice/history
 * 按天分页返回练习历史记录
 * Query params: page（天偏移，0=今天，1=昨天，以此类推）
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
    const page = parseInt(searchParams.get("page") ?? "0");

    // 计算目标日期（UTC）
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setUTCDate(targetDate.getUTCDate() - page);

    const dayStart = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate(),
        0, 0, 0, 0,
      ),
    );
    const dayEnd = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate() + 1,
        0, 0, 0, 0,
      ),
    );

    const dateStr = dayStart.toISOString().slice(0, 10);

    // 查询当天记录（JOIN sentences + categories）
    const records = await db
      .select({
        id: practiceLogs.id,
        score: practiceLogs.score,
        transcript: practiceLogs.transcript,
        practicedAt: practiceLogs.practicedAt,
        sentence: {
          id: sentences.id,
          englishText: sentences.englishText,
          chineseText: sentences.chineseText,
          difficulty: sentences.difficulty,
          category: {
            id: categories.id,
            name: categories.name,
            color: categories.color,
          },
        },
      })
      .from(practiceLogs)
      .innerJoin(sentences, eq(practiceLogs.sentenceId, sentences.id))
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(
        and(
          eq(practiceLogs.userId, currentUserId),
          gte(practiceLogs.practicedAt, dayStart),
          lt(practiceLogs.practicedAt, dayEnd),
        ),
      )
      .orderBy(desc(practiceLogs.practicedAt));

    // 判断是否有更早的记录（page + 1 天前是否有练习）
    const olderDayEnd = dayStart;
    const olderCheck = await db
      .select({ id: practiceLogs.id })
      .from(practiceLogs)
      .where(
        and(
          eq(practiceLogs.userId, currentUserId),
          lt(practiceLogs.practicedAt, olderDayEnd),
        ),
      )
      .limit(1);

    const hasMore = olderCheck.length > 0;

    return NextResponse.json({
      date: dateStr,
      records: records.map((r: (typeof records)[number]) => ({
        id: r.id,
        score: r.score,
        transcript: r.transcript,
        practicedAt: r.practicedAt.toISOString(),
        sentence: {
          id: r.sentence.id,
          englishText: r.sentence.englishText,
          chineseText: r.sentence.chineseText,
          difficulty: r.sentence.difficulty ?? "medium",
          category: {
            id: r.sentence.category.id,
            name: r.sentence.category.name,
            color: r.sentence.category.color ?? "#3b82f6",
          },
        },
      })),
      hasMore,
    });
  } catch (error) {
    console.error("获取练习历史失败:", error);
    return NextResponse.json({ error: "获取练习历史失败" }, { status: 500 });
  }
}
