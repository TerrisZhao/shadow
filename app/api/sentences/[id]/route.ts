import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db/drizzle";
import { sentences } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

// 更新单个句子
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
    const currentUserId = parseInt(session.user.id);

    // 构建更新对象
    const updateData: any = { updatedAt: new Date() };

    // 权限检查：
    // - audioUrl 只有所有者或管理员可以更新
    // - isFavorite 任何用户都可以更新（收藏功能）
    if (audioUrl !== undefined) {
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
      updateData.audioUrl = audioUrl;
    }

    if (isFavorite !== undefined) {
      // 所有用户都可以收藏/取消收藏任何句子
      updateData.isFavorite = isFavorite;
    }

    // 更新句子
    const updatedSentence = await db
      .update(sentences)
      .set(updateData)
      .where(eq(sentences.id, sentenceId))
      .returning();

    return NextResponse.json({
      message: "句子更新成功",
      sentence: updatedSentence[0],
    });
  } catch (error) {
    console.error("更新句子失败:", error);

    return NextResponse.json({ error: "更新句子失败" }, { status: 500 });
  }
}

// 更新句子（完整更新）
export async function PUT(
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
    const currentUserId = parseInt(session.user.id);

    // 检查用户是否为管理员
    const user = session.user as any;
    const isAdmin = user.role && ["admin", "owner"].includes(user.role);

    // 检查权限：
    // 1. 如果是共享句子，只有管理员可以编辑
    // 2. 如果是私有句子，只有所有者可以编辑
    if (sentence.isShared) {
      // 共享句子只有管理员可以编辑
      if (!isAdmin) {
        return NextResponse.json(
          { error: "普通用户不能编辑共享库的句子" },
          { status: 403 },
        );
      }
    } else {
      // 私有句子只有所有者可以编辑
      if (sentence.userId !== currentUserId) {
        return NextResponse.json(
          { error: "您只能编辑自己创建的句子" },
          { status: 403 },
        );
      }
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

    return NextResponse.json({
      message: "句子更新成功",
      sentence: updatedSentence[0],
    });
  } catch (error) {
    console.error("更新句子失败:", error);

    return NextResponse.json({ error: "更新句子失败" }, { status: 500 });
  }
}

// 删除单个句子
export async function DELETE(
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
    const currentUserId = parseInt(session.user.id);

    // 检查用户是否为管理员
    const user = session.user as any;
    const isAdmin = user.role && ["admin", "owner"].includes(user.role);

    // 检查权限：
    // 1. 句子所有者可以删除
    // 2. 管理员可以删除共享句子
    if (sentence.userId !== currentUserId) {
      // 如果不是所有者，检查是否为管理员且句子是共享的
      if (!isAdmin || !sentence.isShared) {
        return NextResponse.json(
          { error: "您只能删除自己创建的句子或管理员可删除共享句子" },
          { status: 403 },
        );
      }
    }

    // 删除句子
    await db.delete(sentences).where(eq(sentences.id, sentenceId));

    return NextResponse.json({
      message: "句子删除成功",
    });
  } catch (error) {
    console.error("删除句子失败:", error);

    return NextResponse.json({ error: "删除句子失败" }, { status: 500 });
  }
}
