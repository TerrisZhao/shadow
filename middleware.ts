import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 公开路径，无需认证
  const publicPaths = [
    "/sign-in",
    "/api/auth",
    "/api/auth/mobile-login",
    "/resume/print/", // PDF 打印页面（Puppeteer 内部访问，需公开）
  ];

  const isPublicPath = publicPaths.some((publicPath) =>
    path.startsWith(publicPath),
  );

  if (isPublicPath) {
    return NextResponse.next();
  }

  // API 路由的认证处理
  if (path.startsWith("/api/")) {
    // 尝试从 Authorization header 获取 token（移动端）
    const authHeader = request.headers.get("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const secret = new TextEncoder().encode(
          process.env.NEXTAUTH_SECRET || "your-secret-key-change-this",
        );
        const { payload } = await jwtVerify(token, secret);

        // Token 验证成功，添加用户信息到 headers
        const requestHeaders = new Headers(request.headers);

        requestHeaders.set("x-user-id", String(payload.userId));
        requestHeaders.set("x-user-email", String(payload.email));
        requestHeaders.set("x-user-role", String(payload.role));

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      } catch (error) {
        console.error("JWT verification failed:", error);

        return NextResponse.json(
          { error: "未授权: Token 无效或已过期" },
          { status: 401 },
        );
      }
    }

    // 尝试使用 NextAuth session（网页端）
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    return NextResponse.next();
  }

  // 页面路由的认证处理（网页端）
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化文件)
     * - favicon.ico (网站图标)
     * - public 文件夹中的文件
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
