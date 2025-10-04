import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";

import { authOptions } from "@/lib/auth/config";
import { db } from "@/lib/db/drizzle";
import { recordings } from "@/lib/db/schema";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const recordingId = parseInt(params.id);

    // 查询录音记录，确保是当前用户的录音
    const [recording] = await db
      .select()
      .from(recordings)
      .where(
        and(eq(recordings.id, recordingId), eq(recordings.userId, userId)),
      );

    if (!recording) {
      return NextResponse.json(
        { error: "录音不存在或无权删除" },
        { status: 404 },
      );
    }

    // 删除录音记录
    await db.delete(recordings).where(eq(recordings.id, recordingId));

    // TODO: 如果需要，可以在这里从R2删除音频文件
    // 但为了简单起见，暂时只删除数据库记录

    return NextResponse.json({
      success: true,
      message: "录音删除成功",
    });
  } catch (error) {
    console.error("删除录音失败:", error);

    return NextResponse.json({ error: "删除录音失败" }, { status: 500 });
  }
}
