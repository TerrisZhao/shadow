import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/config";
import { generateTTS } from "@/lib/tts/generator";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, voice = "af_alloy" } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // 调用共享的 TTS 生成函数
    const result = await generateTTS(text, voice);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "TTS generation failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      text: result.text,
      voice: result.voice,
      size: result.size,
    });
  } catch (error) {
    console.error("TTS error:", error);

    return NextResponse.json(
      { error: "TTS generation failed" },
      { status: 500 },
    );
  }
}
