import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { db } from "@/lib/db/drizzle";
import { practiceLogs } from "@/lib/db/schema";
import { authOptions } from "@/lib/auth/config";

/**
 * POST /api/practice/log
 * 批量写入练习记录（iOS 端在练习结束时调用）
 * Body: { sentenceIds: number[] }
 * Response: { logged: number }
 */
export async function POST(request: NextRequest) {
  try {
    let userIdStr = request.headers.get("x-user-id");

    if (!userIdStr) {
      const session = await getServerSession(authOptions);
      userIdStr = session?.user?.id;
    }

    if (!userIdStr) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const currentUserId = parseInt(userIdStr);

    const body = await request.json();
    const { sentenceIds } = body as { sentenceIds: number[] };

    if (!Array.isArray(sentenceIds) || sentenceIds.length === 0) {
      return NextResponse.json({ logged: 0 });
    }

    const rows = sentenceIds.map((sentenceId) => ({
      userId: currentUserId,
      sentenceId,
    }));

    await db.insert(practiceLogs).values(rows);

    return NextResponse.json({ logged: rows.length });
  } catch (error) {
    console.error("写入练习记录失败:", error);
    return NextResponse.json({ error: "写入练习记录失败" }, { status: 500 });
  }
}
