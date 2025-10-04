import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db/drizzle';
import { sentences, categories, users } from '@/lib/db/schema';
import { eq, and, desc, or, inArray } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/config';
import { generateTTS } from '@/lib/tts/generator';

// 异步生成文字转语音
async function generateTTSAsync(text: string, sentenceId: number) {
  try {
    const result = await generateTTS(text, 'af_alloy');

    if (result.success && result.url) {
      console.log(`TTS generated successfully for sentence ${sentenceId}:`, result.url);
      
      // 保存音频 URL 到数据库
      await db.update(sentences).set({ audioUrl: result.url }).where(eq(sentences.id, sentenceId));
    } else {
      console.error(`TTS generation failed for sentence ${sentenceId}:`, result.error);
    }
  } catch (error) {
    console.error(`TTS generation error for sentence ${sentenceId}:`, error);
  }
}

// 获取句子列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const difficulty = searchParams.get('difficulty');
    const tab = searchParams.get('tab') || 'shared'; // shared, custom, favorite
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const currentUserId = parseInt(session.user.id);
    
    // 构建 where 条件：根据 tab 参数筛选不同的句子
    const whereConditions = [];
    
    // 根据 tab 类型添加筛选条件
    if (tab === 'shared') {
      // 共享库：显示所有标记为共享的句子
      whereConditions.push(eq(sentences.isShared, true));
    } else if (tab === 'custom') {
      // 自定义：只显示当前用户的私有句子
      whereConditions.push(
        eq(sentences.userId, currentUserId),
        eq(sentences.isShared, false)
      );
    } else if (tab === 'favorite') {
      // 收藏：显示当前用户收藏的句子（包括共享的和自己的）
      whereConditions.push(
        or(
          eq(sentences.isShared, true),
          eq(sentences.userId, currentUserId)
        ),
        eq(sentences.isFavorite, true)
      );
    }
    
    if (categoryId) {
      whereConditions.push(eq(sentences.categoryId, parseInt(categoryId)));
    }
    
    if (difficulty) {
      whereConditions.push(eq(sentences.difficulty, difficulty));
    }

    const result = await db
      .select({
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
        updatedAt: sentences.updatedAt,
        category: {
          id: categories.id,
          name: categories.name,
          color: categories.color,
        },
      })
      .from(sentences)
      .innerJoin(categories, eq(sentences.categoryId, categories.id))
      .where(and(...whereConditions))
      .orderBy(desc(sentences.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      sentences: result,
      pagination: {
        page,
        limit,
        hasMore: result.length === limit,
      },
    });
  } catch (error) {
    console.error('获取句子列表失败:', error);
    return NextResponse.json(
      { error: '获取句子列表失败' },
      { status: 500 }
    );
  }
}

// 创建新句子
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { englishText, chineseText, categoryId, difficulty, notes, isShared } = body;

    if (!englishText || !chineseText || !categoryId) {
      return NextResponse.json(
        { error: '英文句子、中文翻译和分类是必填项' },
        { status: 400 }
      );
    }

    // 验证分类是否存在
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (category.length === 0) {
      return NextResponse.json(
        { error: '指定的分类不存在' },
        { status: 400 }
      );
    }

    // 检查用户是否为管理员
    const user = session.user as any;
    const isAdmin = user.role && ['admin', 'owner'].includes(user.role);

    // 只有管理员可以创建共享句子
    const shouldBeShared = isAdmin && isShared === true;

    const newSentence = await db
      .insert(sentences)
      .values({
        englishText,
        chineseText,
        categoryId: parseInt(categoryId),
        userId: parseInt(session.user.id),
        difficulty: difficulty || 'medium',
        notes: notes || null,
        isShared: shouldBeShared,
      })
      .returning();

    // 异步执行文字转语音，不等待结果
    generateTTSAsync(englishText, newSentence[0].id).catch(error => {
      console.error('TTS generation failed for sentence:', newSentence[0].id, error);
    });

    return NextResponse.json({
      message: '句子添加成功',
      sentence: newSentence[0],
    });
  } catch (error) {
    console.error('创建句子失败:', error);
    return NextResponse.json(
      { error: '创建句子失败' },
      { status: 500 }
    );
  }
}
