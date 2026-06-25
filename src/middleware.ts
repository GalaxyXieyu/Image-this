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

  if (token) {
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
