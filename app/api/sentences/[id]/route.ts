import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and, sql, isNull } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { sentences, categories, userSentenceFavorites, users } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";
import { extractKeyFromUrl, deleteFromR2 } from "@/lib/utils/r2-client";

// 获取单个句子详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sentenceId = parseInt(resolvedParams.id);

    if (isNaN(sentenceId)) {
      return NextResponse.json({ error: "无效的句子ID" }, { status: 400 });
    }

    const currentUserId = parseInt(session.user.id);

    // 查询句子详情，包含分类信息
    const sentenceData = await db
      .select({
        id: sentences.id,
        englishText: sentences.englishText,
        chineseText: sentences.chineseText,
        difficulty: sentences.difficulty,
        notes: sentences.notes,
        isShared: sentences.isShared,
        audioUrl: sentences.audioUrl,
        userId: sentences.userId,
        createdAt: sentences.createdAt,
        updatedAt: sentences.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          color: categories.color,
        },
        isFavorite: sql<boolean>`EXISTS (
          SELECT 1 FROM ${userSentenceFavorites}
          WHERE ${userSentenceFavorites.sentenceId} = ${sentences.id}
          AND ${userSentenceFavorites.userId} = ${currentUserId}
        )`,
      })
      .from(sentences)
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(and(eq(sentences.id, sentenceId), isNull(categories.deletedAt)))
      .limit(1);

    if (sentenceData.length === 0) {
      return NextResponse.json({ error: "句子不存在" }, { status: 404 });
    }

    return NextResponse.json({
      sentence: sentenceData[0],
    });
  } catch (error) {
    return NextResponse.json({ error: "获取句子失败" }, { status: 500 });
  }
}

// 更新单个句子（PATCH用于部分更新）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sentenceId = parseInt(resolvedParams.id);

    if (isNaN(sentenceId)) {
      return NextResponse.json({ error: "无效的句子ID" }, { status: 400 });
    }

    const body = await request.json();
    const { audioUrl, isFavorite } = body;

    // 至少需要一个字段
    if (audioUrl === undefined && isFavorite === undefined) {
      return NextResponse.json(
        { error: "至少需要提供一个更新字段" },
        { status: 400 },
      );
    }

    const currentUserId = parseInt(session.user.id);

    // 处理收藏状态更新
    if (isFavorite !== undefined) {
      // 检查句子是否存在
      const existingSentence = await db
        .select()
        .from(sentences)
        .where(eq(sentences.id, sentenceId))
        .limit(1);

      if (existingSentence.length === 0) {
        return NextResponse.json({ error: "句子不存在" }, { status: 404 });
      }

      // 处理收藏/取消收藏
      if (isFavorite) {
        // 添加收藏（使用 onConflictDoNothing 避免重复插入错误）
        await db
          .insert(userSentenceFavorites)
          .values({
            userId: currentUserId,
            sentenceId: sentenceId,
          })
          .onConflictDoNothing();
      } else {
        // 取消收藏
        await db
          .delete(userSentenceFavorites)
          .where(
            and(
              eq(userSentenceFavorites.userId, currentUserId),
              eq(userSentenceFavorites.sentenceId, sentenceId),
            ),
          );
      }

      return NextResponse.json({
        message: isFavorite ? "已添加到收藏" : "已取消收藏",
        isFavorite: isFavorite,
      });
    }

    // 处理audioUrl更新（需要权限检查）
    if (audioUrl !== undefined) {
      // 检查句子是否存在
      const existingSentence = await db
        .select()
        .from(sentences)
        .where(eq(sentences.id, sentenceId))
        .limit(1);

      if (existingSentence.length === 0) {
        return NextResponse.json({ error: "句子不存在" }, { status: 404 });
      }

      const sentence = existingSentence[0];

      // 检查 audioUrl 更新权限
      if (sentence.userId !== currentUserId) {
        const user = session.user as any;

        if (!user.role || !["admin", "owner"].includes(user.role)) {
          return NextResponse.json(
            { error: "无权限更新此句子的音频" },
            { status: 403 },
          );
        }
      }

      // 更新句子
      const updatedSentence = await db
        .update(sentences)
        .set({
          audioUrl: audioUrl,
          updatedAt: new Date(),
        })
        .where(eq(sentences.id, sentenceId))
        .returning();

      return NextResponse.json({
        message: "句子更新成功",
        sentence: updatedSentence[0],
      });
    }

    return NextResponse.json({ error: "无效的请求" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "更新句子失败" }, { status: 500 });
  }
}

// 更新句子（完整更新）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 支持移动端（x-user-id header）和网页端（session）两种认证方式
    let userIdStr = request.headers.get("x-user-id");
    let userRole: string | undefined;

    if (!userIdStr) {
      const session = await getServerSession(authOptions);

      userIdStr = session?.user?.id;
      userRole = (session?.user as any)?.role;
    } else {
      // mobile auth：从数据库补查 role
      const userRecord = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, parseInt(userIdStr)))
        .limit(1);

      userRole = userRecord[0]?.role ?? undefined;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sentenceId = parseInt(resolvedParams.id);

    if (isNaN(sentenceId)) {
      return NextResponse.json({ error: "无效的句子ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      englishText,
      chineseText,
      categoryId,
      difficulty,
      notes,
      isShared,
    } = body;

    if (!englishText || !categoryId) {
      return NextResponse.json(
        { error: "英文句子和分类是必填项" },
        { status: 400 },
      );
    }

    // 检查句子是否存在
    const existingSentence = await db
      .select()
      .from(sentences)
      .where(eq(sentences.id, sentenceId))
      .limit(1);

    if (existingSentence.length === 0) {
      return NextResponse.json({ error: "句子不存在" }, { status: 404 });
    }

    const sentence = existingSentence[0];
    const currentUserId = parseInt(userIdStr);
    const isAdmin = userRole && ["admin", "owner"].includes(userRole);

    // admin/owner 可编辑所有句子；普通用户只能编辑自己的句子，不能编辑共享句子
    if (isAdmin) {
      // 有权限，继续
    } else if (sentence.isShared) {
      return NextResponse.json(
        { error: "普通用户不能编辑共享库的句子" },
        { status: 403 },
      );
    } else if (sentence.userId !== currentUserId) {
      return NextResponse.json(
        { error: "您只能编辑自己创建的句子" },
        { status: 403 },
      );
    }

    // 构建更新对象
    const updateData: any = {
      englishText,
      chineseText:
        typeof chineseText === "string" && chineseText.trim()
          ? chineseText.trim()
          : null,
      categoryId: parseInt(categoryId),
      difficulty: difficulty || "medium",
      notes: notes ? String(notes) : null,
      updatedAt: new Date(),
    };

    // 只有管理员可以修改 isShared 字段
    if (isAdmin && isShared !== undefined) {
      updateData.isShared = isShared;
    }

    // 更新句子
    const updatedSentence = await db
      .update(sentences)
      .set(updateData)
      .where(eq(sentences.id, sentenceId))
      .returning();

    // 查询 category 信息（iOS 客户端需要嵌套的 category 对象）
    const categoryResult = await db
      .select()
      .from(categories)
      .where(eq(categories.id, parseInt(categoryId)))
      .limit(1);

    const sentenceWithCategory = {
      ...updatedSentence[0],
      category: categoryResult[0] ?? null,
    };

    return NextResponse.json({
      message: "句子更新成功",
      sentence: sentenceWithCategory,
    });
  } catch (error) {
    return NextResponse.json({ error: "更新句子失败" }, { status: 500 });
  }
}

// 删除单个句子
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 支持移动端（x-user-id header）和网页端（session）两种认证方式
    let userIdStr = request.headers.get("x-user-id");
    let userRole: string | undefined;

    if (!userIdStr) {
      const session = await getServerSession(authOptions);

      userIdStr = session?.user?.id;
      userRole = (session?.user as any)?.role;
    } else {
      // mobile auth：从数据库补查 role
      const userRecord = await db
        .select({ role: users.role })
        .from(users)
        .where(eq(users.id, parseInt(userIdStr)))
        .limit(1);

      userRole = userRecord[0]?.role ?? undefined;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const resolvedParams = await params;
    const sentenceId = parseInt(resolvedParams.id);

    if (isNaN(sentenceId)) {
      return NextResponse.json({ error: "无效的句子ID" }, { status: 400 });
    }

    // 检查句子是否存在
    const existingSentence = await db
      .select()
      .from(sentences)
      .where(eq(sentences.id, sentenceId))
      .limit(1);

    if (existingSentence.length === 0) {
      return NextResponse.json({ error: "句子不存在" }, { status: 404 });
    }

    const sentence = existingSentence[0];
    const currentUserId = parseInt(userIdStr);
    const isAdmin = userRole && ["admin", "owner"].includes(userRole);

    // admin/owner 可删除所有句子；普通用户只能删除自己的句子
    if (!isAdmin && sentence.userId !== currentUserId) {
      return NextResponse.json(
        { error: "您只能删除自己创建的句子" },
        { status: 403 },
      );
    }

    // 如果有音频文件，尝试从R2删除
    if (sentence.audioUrl) {
      const objectKey = extractKeyFromUrl(sentence.audioUrl);

      if (objectKey) {
        const deleteResult = await deleteFromR2(objectKey);

        if (!deleteResult.success) {
          // 继续删除数据库记录，即使R2删除失败
        }
      }
    }

    // 删除句子（会级联删除收藏记录）
    await db.delete(sentences).where(eq(sentences.id, sentenceId));

    return NextResponse.json({
      message: "句子删除成功",
    });
  } catch (error) {
    return NextResponse.json({ error: "删除句子失败" }, { status: 500 });
  }
}
