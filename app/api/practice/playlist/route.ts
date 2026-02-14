import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, sql, isNull, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { sentences, categories } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * 获取播放列表（随身听模式）
 * 返回符合筛选条件的所有句子（无分页），用于顺序播放。
 * 查询参数:
 * - categoryId: 分类ID筛选（可选）
 * - difficulty: 难度筛选（可选）
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

    const currentUserId = parseInt(userIdStr);

    // 构建查询条件
    const whereConditions = [
      // 只查询共享句子或用户自己的句子
      sql`(${sentences.isShared} = true OR ${sentences.userId} = ${currentUserId})`,
      // 只返回有音频的句子
      isNotNull(sentences.audioUrl),
    ];

    if (difficulty) {
      whereConditions.push(eq(sentences.difficulty, difficulty));
    }

    if (categoryId) {
      whereConditions.push(eq(sentences.categoryId, parseInt(categoryId)));
    }

    const result = await db
      .select({
        id: sentences.id,
        englishText: sentences.englishText,
        chineseText: sentences.chineseText,
        difficulty: sentences.difficulty,
        audioUrl: sentences.audioUrl,
      })
      .from(sentences)
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(and(isNull(categories.deletedAt), ...whereConditions))
      .orderBy(sentences.id)
      .limit(500);

    return NextResponse.json({
      sentences: result,
      total: result.length,
    });
  } catch (error) {
    console.error("获取播放列表失败:", error);
    return NextResponse.json({ error: "获取播放列表失败" }, { status: 500 });
  }
}
