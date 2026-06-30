import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PROTECTED_PREFIXES = [
  "/workspace",
  "/combo",
  "/tools",
  "/templates",
  "/tasks",
  "/results",
  "/settings",
  "/prompt-studio",
];

function isProtectedPath(pathname: string) {
  if (pathname === "/") return true;

  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 有 token.id 才算登录；NextAuth jwt callback 在用户行消失时会清空 token
  // (返回 {})，那时 token 仍为 truthy 但没有 id —— 必须按未登录处理。
  if (token?.id) {
    // 已登录访问根路由：直接进工作台，不展示营销首页
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/workspace", request.url));
    }
    return NextResponse.next();
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    pathname === "/" ? "/workspace/scene" : `${pathname}${search}`
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/",
    "/workspace/:path*",
    "/combo/:path*",
    "/tools/:path*",
    "/templates/:path*",
    "/tasks/:path*",
    "/results/:path*",
    "/settings/:path*",
    "/prompt-studio/:path*",
  ],
};
