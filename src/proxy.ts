import { NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy, createNonce, CSP_HEADER } from "@/lib/csp";
import { serverEnv } from "@/lib/env.server";
import { safeRedirectPath } from "@/lib/safeRedirect";

const SESSION_COOKIE = "vertice_session";
const AUTH_PATHS = ["/login", "/cadastro"];
const PROTECTED_PREFIXES = ["/dashboard", "/alunos", "/planos", "/exercicios", "/perfil"];
// Reachable with or without a session (exact match): the first-access link a trainer shares may
// be opened in a browser where someone (the trainer, testing it) is signed in, and the legal texts
// are linked from the registration form and from inside the app.
const PUBLIC_PATHS = ["/definir-senha", "/termos", "/privacidade"];

/** Renders the page, with a per-request nonce in the CSP (see `src/lib/csp.ts`). */
function renderWithCsp(request: NextRequest): NextResponse {
  const csp = buildContentSecurityPolicy(createNonce(), { dev: !serverEnv().isProduction });
  // Next reads the nonce from the request's CSP header while rendering.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_HEADER, csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return renderWithCsp(request);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isAuthPath = AUTH_PATHS.some((path) => pathname === path);
  const isProtectedPath = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtectedPath && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set(
      "redirect",
      safeRedirectPath(`${pathname}${request.nextUrl.search}`, request.nextUrl.origin),
    );
    return NextResponse.redirect(url);
  }

  if (isAuthPath && hasSession) {
    // Already signed in: go where the login would have (a same-origin path only).
    const target = new URL(
      safeRedirectPath(request.nextUrl.searchParams.get("redirect"), request.nextUrl.origin),
      request.nextUrl.origin,
    );
    const url = request.nextUrl.clone();
    url.pathname = target.pathname;
    url.search = target.search;
    return NextResponse.redirect(url);
  }

  return renderWithCsp(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-mark.png).*)",
  ],
};
