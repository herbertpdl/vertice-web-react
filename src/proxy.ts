import { NextRequest, NextResponse } from "next/server";
import { adminSessionCookieName } from "@/lib/adminCookies";
import { buildContentSecurityPolicy, createNonce, CSP_HEADER } from "@/lib/csp";
import { serverEnv } from "@/lib/env.server";
import { workspaceOf } from "@/lib/host";
import { safeAdminRedirectPath, safeRedirectPath } from "@/lib/safeRedirect";

// The edge guard. The workspace comes first (`Host` only, `src/lib/host.ts`), then that
// workspace's own table (admin-panel spec §1). A path outside it is a plain 404, never a redirect,
// so neither host reveals the other's URLs.

const SESSION_COOKIE = "vertice_session";
const AUTH_PATHS = ["/login", "/cadastro"];
const PROTECTED_PREFIXES = ["/dashboard", "/alunos", "/planos", "/exercicios", "/perfil"];
// Reachable with or without a session (exact match): the first-access link a trainer shares may
// be opened in a browser where someone (the trainer, testing it) is signed in; the legal texts are
// linked from the registration form and from inside the app, and `/suporte` from the store listings.
const PUBLIC_PATHS = ["/definir-senha", "/termos", "/privacidade", "/suporte"];

/** The admin workspace's pages: `/painel` and everything under it. No trainer path starts so. */
const ADMIN_PREFIX = "/painel";
const ADMIN_SIGN_IN = "/painel/entrar";
/**
 * What passes on both hosts: the liveness check, the metadata icon route and Next's own paths
 * (`/_next/**`, and `/__nextjs*` such as the dev overlay's endpoints). `/_next/static`,
 * `/_next/image`, `/favicon.ico` and `/logo-mark.png` never reach the proxy (matcher below).
 */
const SHARED_PATHS = ["/healthz", "/icon.png"];
const SHARED_PREFIXES = ["/_next/", "/__nextjs"];

function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isShared(pathname: string): boolean {
  return SHARED_PATHS.includes(pathname) || SHARED_PREFIXES.some((p) => pathname.startsWith(p));
}

function notFound(): NextResponse {
  return new NextResponse("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

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

function redirectTo(request: NextRequest, path: string): NextResponse {
  const target = new URL(path, request.nextUrl.origin);
  const url = request.nextUrl.clone();
  url.pathname = target.pathname;
  url.search = target.search;
  return NextResponse.redirect(url);
}

/**
 * The admin host (`ADMIN_HOST`): only `/painel/**` and the shared paths. The proxy only checks that
 * the admin cookie exists; the `(admin)` layout's server-side `GET /auth/me` decides the role. A
 * `vertice_session` cookie here counts as no cookie.
 */
function adminProxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isShared(pathname)) return renderWithCsp(request);
  const hasSession = request.cookies.has(adminSessionCookieName(serverEnv().isProduction));

  if (pathname === "/") return redirectTo(request, hasSession ? ADMIN_PREFIX : ADMIN_SIGN_IN);
  // Rendered with or without a cookie: never redirected away, so a stale cookie can't loop, and
  // a fresh sign-in overwrites it.
  if (pathname === ADMIN_SIGN_IN) return renderWithCsp(request);
  if (!isUnder(pathname, ADMIN_PREFIX)) return notFound();

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = ADMIN_SIGN_IN;
    url.search = "";
    url.searchParams.set(
      "redirect",
      safeAdminRedirectPath(`${pathname}${request.nextUrl.search}`, request.nextUrl.origin),
    );
    return NextResponse.redirect(url);
  }
  return renderWithCsp(request);
}

/** www, and any host that isn't `ADMIN_HOST`: today's table, plus a 404 for `/painel/**`. */
function trainerProxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  if (isUnder(pathname, ADMIN_PREFIX)) return notFound();
  if (PUBLIC_PATHS.includes(pathname)) return renderWithCsp(request);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isAuthPath = AUTH_PATHS.some((path) => pathname === path);
  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) => isUnder(pathname, prefix));

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
    return redirectTo(
      request,
      safeRedirectPath(request.nextUrl.searchParams.get("redirect"), request.nextUrl.origin),
    );
  }

  return renderWithCsp(request);
}

export function proxy(request: NextRequest) {
  return workspaceOf(request.headers) === "admin" ? adminProxy(request) : trainerProxy(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|logo-mark.png).*)",
  ],
};
