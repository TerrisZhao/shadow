import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, sql, notInArray } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { sentences, categories } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * 获取随机练习句子
 * 查询参数:
 * - difficulty: 难度筛选 (easy, medium, hard)
 * - categoryId: 分类ID筛选
 * - excludeIds: 排除的句子ID列表（逗号分隔），用于避免重复
 */
export async function GET(request: NextRequest) {
  try {
    // 尝试从 headers 获取（移动端）
    let userIdStr = request.headers.get("x-user-id");

    // 如果没有，尝试从 session 获取（网页端）
    if (!userIdStr) {
      const session = await getServerSession(authOptions);

      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get("difficulty");
    const categoryId = searchParams.get("categoryId");
    const excludeIdsStr = searchParams.get("excludeIds");

    const currentUserId = parseInt(userIdStr);

    // 构建查询条件
    const whereConditions = [
      // 只查询共享句子或用户自己的句子
      sql`(${sentences.isShared} = true OR ${sentences.userId} = ${currentUserId})`,
    ];

    if (difficulty) {
      whereConditions.push(eq(sentences.difficulty, difficulty));
    }

    if (categoryId) {
      whereConditions.push(eq(sentences.categoryId, parseInt(categoryId)));
    }

    // 排除已经练习过的句子
    if (excludeIdsStr) {
      const excludeIds = excludeIdsStr
        .split(",")
        .map((id) => parseInt(id))
        .filter((id) => !isNaN(id));

      if (excludeIds.length > 0) {
        whereConditions.push(notInArray(sentences.id, excludeIds));
      }
    }

    // 先查询符合条件的句子总数
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sentences)
      .where(and(...whereConditions));

    const totalCount = Number(countResult[0]?.count || 0);

    if (totalCount === 0) {
      return NextResponse.json(
        { error: "没有找到符合条件的句子" },
        { status: 404 },
      );
    }

    // 使用随机偏移量获取一条随机句子
    const randomOffset = Math.floor(Math.random() * totalCount);

    const randomSentence = await db
      .select({
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
      })
      .from(sentences)
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(and(...whereConditions))
      .limit(1)
      .offset(randomOffset);

    if (randomSentence.length === 0) {
      return NextResponse.json(
        { error: "没有找到符合条件的句子" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      sentence: randomSentence[0],
      totalAvailable: totalCount,
    });
  } catch (error) {
    return NextResponse.json({ error: "获取随机句子失败" }, { status: 500 });
  }
}
