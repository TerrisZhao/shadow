import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { scenes, sceneSentences, sentences, categories } from "@/lib/db/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const tab = searchParams.get("tab") || "shared";
    const offset = (page - 1) * limit;

    const userId = parseInt((session.user as any).id);

    let whereCondition;
    let orderBy;

    switch (tab) {
      case "shared":
        whereCondition = eq(scenes.isShared, true);
        orderBy = desc(scenes.createdAt);
        break;
      case "custom":
        whereCondition = and(
          eq(scenes.userId, userId),
          eq(scenes.isShared, false)
        );
        orderBy = desc(scenes.createdAt);
        break;
      case "favorite":
        whereCondition = and(
          eq(scenes.userId, userId),
          eq(scenes.isFavorite, true)
        );
        orderBy = desc(scenes.updatedAt);
        break;
      default:
        whereCondition = eq(scenes.isShared, true);
        orderBy = desc(scenes.createdAt);
    }

    // 获取场景列表
    const scenesList = await db
      .select({
        id: scenes.id,
        title: scenes.title,
        description: scenes.description,
        isShared: scenes.isShared,
        isFavorite: scenes.isFavorite,
        userId: scenes.userId,
        createdAt: scenes.createdAt,
        updatedAt: scenes.updatedAt,
        sentencesCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${sceneSentences} 
          WHERE ${sceneSentences.sceneId} = ${scenes.id}
        )`,
      })
      .from(scenes)
      .where(whereCondition)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // 获取总数
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(scenes)
      .where(whereCondition);

    const total = totalResult[0]?.count || 0;
    const hasMore = offset + scenesList.length < total;

    return NextResponse.json({
      scenes: scenesList,
      pagination: {
        page,
        limit,
        total,
        hasMore,
      },
    });
  } catch (error) {
    console.error("获取场景列表失败:", error);
    return NextResponse.json(
      { error: "获取场景列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, sentenceIds } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "场景标题不能为空" },
        { status: 400 }
      );
    }

    const userId = parseInt((session.user as any).id);

    // 创建场景
    const [newScene] = await db
      .insert(scenes)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        userId,
        isShared: false,
        isFavorite: false,
      })
      .returning();

    // 如果有句子ID，创建场景句子关联
    if (sentenceIds && Array.isArray(sentenceIds) && sentenceIds.length > 0) {
      const sceneSentenceData = sentenceIds.map((sentenceId: number, index: number) => ({
        sceneId: newScene.id,
        sentenceId,
        order: index,
      }));

      await db.insert(sceneSentences).values(sceneSentenceData);
    }

    return NextResponse.json({
      scene: newScene,
      message: "场景创建成功",
    });
  } catch (error) {
    console.error("创建场景失败:", error);
    return NextResponse.json(
      { error: "创建场景失败" },
      { status: 500 }
    );
  }
}
