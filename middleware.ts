import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // 这里可以添加额外的中间件逻辑
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // 允许访问首页
        if (req.nextUrl.pathname === "/") {
          return true;
        }

        // 允许访问登录页面
        if (req.nextUrl.pathname === "/sign-in") {
          return true;
        }

        // 允许访问 API 路由
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return true;
        }

        // 其他页面需要登录
        return !!token;
      },
    },
  },
);

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
