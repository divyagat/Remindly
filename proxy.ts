import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, AUTH_ENABLED, verifySessionToken } from "@/lib/auth";

const PROTECTED_PATHS = ["/dashboard", "/tasks", "/calendar", "/completed", "/overdue", "/settings"];
const AUTH_ONLY_PATHS = ["/login", "/register"];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!AUTH_ENABLED) {
    if (matchesPath(pathname, AUTH_ONLY_PATHS)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (matchesPath(pathname, PROTECTED_PATHS) && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPath(pathname, AUTH_ONLY_PATHS) && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/completed/:path*",
    "/overdue/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};
