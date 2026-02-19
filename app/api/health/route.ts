import { NextResponse } from "next/server";

/**
 * 健康检查端点
 * 用于 Docker 健康检查和监控
 */
export async function GET() {
  try {
    // 可以在这里添加数据库连接检查等
    // const { db } = await import("@/lib/db/drizzle");
    // await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
