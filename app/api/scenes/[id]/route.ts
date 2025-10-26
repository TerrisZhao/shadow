import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, asc } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { scenes, sceneSentences, sentences, categories } from "@/lib/db/schema";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const sceneId = parseInt(params.id);

    if (isNaN(sceneId)) {
      return NextResponse.json({ error: "无效的场景ID" }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id);

    // 获取场景信息
    const [scene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId));

    if (!scene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 检查权限：只有场景创建者或共享场景才能访问
    if (scene.userId !== userId && !scene.isShared) {
      return NextResponse.json({ error: "无权限访问此场景" }, { status: 403 });
    }

    // 获取场景中的句子
    const sceneSentencesList = await db
      .select({
        id: sceneSentences.id,
        order: sceneSentences.order,
        sentence: {
          id: sentences.id,
          englishText: sentences.englishText,
          chineseText: sentences.chineseText,
          difficulty: sentences.difficulty,
          notes: sentences.notes,
          isFavorite: sentences.isFavorite,
          isShared: sentences.isShared,
          audioUrl: sentences.audioUrl,
          userId: sentences.userId,
          createdAt: sentences.createdAt,
          category: {
            id: categories.id,
            name: categories.name,
            color: categories.color,
          },
        },
      })
      .from(sceneSentences)
      .innerJoin(sentences, eq(sceneSentences.sentenceId, sentences.id))
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(eq(sceneSentences.sceneId, sceneId))
      .orderBy(asc(sceneSentences.order));

    return NextResponse.json({
      scene,
      sentences: sceneSentencesList,
    });
  } catch (error) {
    console.error("获取场景详情失败:", error);

    return NextResponse.json({ error: "获取场景详情失败" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const sceneId = parseInt(params.id);

    if (isNaN(sceneId)) {
      return NextResponse.json({ error: "无效的场景ID" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, isFavorite, sentenceIds } = body;

    const userId = parseInt((session.user as any).id);

    // 检查场景是否存在和权限
    const [existingScene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId));

    if (!existingScene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 只有场景创建者才能编辑
    if (existingScene.userId !== userId) {
      return NextResponse.json({ error: "无权限编辑此场景" }, { status: 403 });
    }

    // 更新场景信息
    const updateData: any = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db.update(scenes).set(updateData).where(eq(scenes.id, sceneId));
    }

    // 如果提供了句子ID列表，更新场景句子关联
    if (sentenceIds !== undefined) {
      // 删除现有的关联
      await db
        .delete(sceneSentences)
        .where(eq(sceneSentences.sceneId, sceneId));

      // 创建新的关联
      if (Array.isArray(sentenceIds) && sentenceIds.length > 0) {
        const sceneSentenceData = sentenceIds.map(
          (sentenceId: number, index: number) => ({
            sceneId,
            sentenceId,
            order: index,
          }),
        );

        await db.insert(sceneSentences).values(sceneSentenceData);
      }
    }

    return NextResponse.json({ message: "场景更新成功" });
  } catch (error) {
    console.error("更新场景失败:", error);

    return NextResponse.json({ error: "更新场景失败" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const sceneId = parseInt(params.id);

    if (isNaN(sceneId)) {
      return NextResponse.json({ error: "无效的场景ID" }, { status: 400 });
    }

    const userId = parseInt((session.user as any).id);

    // 检查场景是否存在和权限
    const [existingScene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, sceneId));

    if (!existingScene) {
      return NextResponse.json({ error: "场景不存在" }, { status: 404 });
    }

    // 只有场景创建者才能删除
    if (existingScene.userId !== userId) {
      return NextResponse.json({ error: "无权限删除此场景" }, { status: 403 });
    }

    // 删除场景（级联删除场景句子关联）
    await db.delete(scenes).where(eq(scenes.id, sceneId));

    return NextResponse.json({ message: "场景删除成功" });
  } catch (error) {
    console.error("删除场景失败:", error);

    return NextResponse.json({ error: "删除场景失败" }, { status: 500 });
  }
}
