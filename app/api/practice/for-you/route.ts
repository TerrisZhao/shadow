import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, sql, notInArray, inArray, isNull, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { sentences, categories, practiceLogs } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * 获取智能推荐句子（For You）
 * 根据用户练习历史推荐 10 句：
 * - 优先未练过的句子（目标 7 句）
 * - 混入练习 1-3 次的强化句（目标 3 句）
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

    // Step 1: 获取用户已练句子及其练习次数
    const practiceCountRows = await db
      .select({
        sentenceId: practiceLogs.sentenceId,
        count: sql<number>`count(*)::int`,
      })
      .from(practiceLogs)
      .where(eq(practiceLogs.userId, currentUserId))
      .groupBy(practiceLogs.sentenceId);

    const practicedIds = practiceCountRows.map((r: { sentenceId: number; count: number }) => r.sentenceId);
    const reinforceIds = practiceCountRows
      .filter((r: { sentenceId: number; count: number }) => r.count >= 1 && r.count <= 3)
      .map((r: { sentenceId: number; count: number }) => r.sentenceId);

    // 基础条件：共享句子或用户自己的句子，且有音频
    const baseConditions = [
      sql`(${sentences.isShared} = true OR ${sentences.userId} = ${currentUserId})`,
      isNotNull(sentences.audioUrl),
    ];

    const selectFields = {
      id: sentences.id,
      englishText: sentences.englishText,
      chineseText: sentences.chineseText,
      difficulty: sentences.difficulty,
      audioUrl: sentences.audioUrl,
      category: {
        id: categories.id,
        name: categories.name,
        color: categories.color,
      },
    };

    // Step 2: 未练句（目标 7 句）
    const unpracticedConditions = [
      ...baseConditions,
      ...(practicedIds.length > 0 ? [notInArray(sentences.id, practicedIds)] : []),
    ];

    const unpracticedRows = await db
      .select(selectFields)
      .from(sentences)
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(and(isNull(categories.deletedAt), ...unpracticedConditions))
      .orderBy(sql`RANDOM()`)
      .limit(7);

    // Step 3: 强化句（练习 1-3 次，目标 3 句）
    let reinforceRows: typeof unpracticedRows = [];
    if (reinforceIds.length > 0) {
      reinforceRows = await db
        .select(selectFields)
        .from(sentences)
        .innerJoin(categories, eq(sentences.categoryId, categories.id))
        .where(
          and(
            isNull(categories.deletedAt),
            ...baseConditions,
            inArray(sentences.id, reinforceIds),
          ),
        )
        .orderBy(sql`RANDOM()`)
        .limit(3);
    }

    // Step 4: 合并去重
    const seenIds = new Set<number>();
    const merged: typeof unpracticedRows = [];

    for (const row of [...unpracticedRows, ...reinforceRows]) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        merged.push(row);
      }
    }

    // 不足 10 句时随机补足
    if (merged.length < 10) {
      const supplementConditions = [
        ...baseConditions,
        ...(merged.length > 0 ? [notInArray(sentences.id, Array.from(seenIds))] : []),
      ];

      const supplement = await db
        .select(selectFields)
        .from(sentences)
        .innerJoin(categories, eq(sentences.categoryId, categories.id))
        .where(and(isNull(categories.deletedAt), ...supplementConditions))
        .orderBy(sql`RANDOM()`)
        .limit(10 - merged.length);

      for (const row of supplement) {
        if (!seenIds.has(row.id)) {
          seenIds.add(row.id);
          merged.push(row);
        }
      }
    }

    // 最终随机排序，限制 10 句
    const result = merged.sort(() => Math.random() - 0.5).slice(0, 10);

    return NextResponse.json({
      sentences: result,
      total: result.length,
    });
  } catch (error) {
    console.error("获取推荐句子失败:", error);
    return NextResponse.json({ error: "获取推荐句子失败" }, { status: 500 });
  }
}
