import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { sendMessage, systemMessages } from "@/lib/ai/config";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const body = await request.json();
    const { message, context } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "请提供消息内容" },
        { status: 400 }
      );
    }

    // 构建消息
    const messages = [
      systemMessages.englishTutor,
      new HumanMessage(message),
    ];

    // 如果有上下文，添加到消息中
    if (context) {
      messages.splice(1, 0, new HumanMessage(`上下文信息：${context}`));
    }

    const result = await sendMessage(messages);

    return NextResponse.json({
      success: true,
      result,
      message,
    });
  } catch (error) {
    console.error("AI 聊天失败:", error);
    return NextResponse.json(
      { error: "AI 聊天失败，请稍后重试" },
      { status: 500 }
    );
  }
}
