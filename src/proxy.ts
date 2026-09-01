import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "vertice_session";
const AUTH_PATHS = ["/login", "/cadastro"];
const PROTECTED_PREFIXES = ["/dashboard", "/alunos", "/planos", "/exercicios"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isAuthPath = AUTH_PATHS.some((path) => pathname === path);
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedPath && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPath && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-mark.png).*)",
  ],
};
