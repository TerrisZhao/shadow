import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { analyzeSentence, translateSentence, getLearningAdvice } from "@/lib/ai/config";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { sentence, action, userLevel } = body;

    if (!sentence || !sentence.trim()) {
      return NextResponse.json(
        { error: "请提供要分析的句子" },
        { status: 400 }
      );
    }

    let result: string;

    switch (action) {
      case "analyze":
        result = await analyzeSentence(sentence);
        break;
      case "translate":
        result = await translateSentence(sentence);
        break;
      case "advice":
        result = await getLearningAdvice(sentence, userLevel);
        break;
      default:
        return NextResponse.json(
          { error: "不支持的操作类型" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      action,
      sentence,
    });
  } catch (error) {
    console.error("AI 分析失败:", error);
    return NextResponse.json(
      { error: "AI 分析失败，请稍后重试" },
      { status: 500 }
    );
  }
}
