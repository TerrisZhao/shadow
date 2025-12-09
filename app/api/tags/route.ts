import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, desc, sql, ilike, or, and, inArray } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { tags, sentenceTags, users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 获取标签列表
// 支持：搜索、获取引用次数 top20 的标签
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search"); // 搜索关键词
    const limit = parseInt(searchParams.get("limit") || "20");

    const currentUserId = parseInt(session.user.id);

    // 获取管理员用户ID列表
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ["admin", "owner"]));

    const adminUserIds = adminUsers.map((user: { id: number }) => user.id);

    // 构建基础查询条件：预设标签、当前用户标签、管理员标签
    const baseConditions = or(
      eq(tags.isPreset, true),
      eq(tags.userId, currentUserId),
      and(inArray(tags.userId, adminUserIds), eq(tags.isPreset, false)),
    );

    if (search && search.trim()) {
      // 如果有搜索关键词，按名称搜索并按引用次数排序
      const searchTerm = `%${search.trim()}%`;

      const result = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          isPreset: tags.isPreset,
          referenceCount: sql<number>`COALESCE(
            (SELECT COUNT(*) FROM ${sentenceTags} WHERE ${sentenceTags.tagId} = ${tags.id}),
            0
          )`.as("reference_count"),
        })
        .from(tags)
        .where(and(baseConditions, ilike(tags.name, searchTerm)))
        .orderBy(
          desc(
            sql`(SELECT COUNT(*) FROM ${sentenceTags} WHERE ${sentenceTags.tagId} = ${tags.id})`,
          ),
        )
        .limit(limit);

      return NextResponse.json({ tags: result });
    }

    // 默认：获取引用次数 top N 的标签
    const result = await db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color,
        isPreset: tags.isPreset,
        referenceCount: sql<number>`COALESCE(
          (SELECT COUNT(*) FROM ${sentenceTags} WHERE ${sentenceTags.tagId} = ${tags.id}),
          0
        )`.as("reference_count"),
      })
      .from(tags)
      .where(baseConditions)
      .orderBy(
        desc(
          sql`(SELECT COUNT(*) FROM ${sentenceTags} WHERE ${sentenceTags.tagId} = ${tags.id})`,
        ),
      )
      .limit(limit);

    return NextResponse.json({ tags: result });
  } catch (error) {
    console.error("获取标签列表失败:", error);

    return NextResponse.json({ error: "获取标签列表失败" }, { status: 500 });
  }
}
