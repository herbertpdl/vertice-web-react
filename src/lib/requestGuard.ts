import { NextResponse } from "next/server";

// CSRF and body-type checks for every `/api/*` route handler. The session cookie rides along on
// any request the browser sends to this origin, and `request.json()` parses a body whatever its
// Content-Type, so without this a page on another site could post a `<form enctype="text/plain">`
// whose body is valid JSON (login CSRF: the victim ends up signed in as the attacker) or drive the
// BFF proxy. `SameSite` alone doesn't cover a compromised sibling subdomain (same-site).
//
// Same-origin is decided by the browser's own headers, which a page can't forge:
// - An unsafe method (POST/PUT/PATCH/DELETE) must carry `Origin`: browsers always send it there,
//   so only non-browser clients go without.
// - `Sec-Fetch-Site` (all current browsers) then decides: only `same-origin` passes; `none`
//   (typed URL, bookmark) passes for safe methods only.
// - Otherwise `Origin` (older browsers): its host must be this request's host. The host, not the
//   full origin: behind a TLS-terminating proxy that doesn't send X-Forwarded-Proto, Next sees
//   `http:` while the browser says `https:`.
// - A safe method (GET/HEAD/OPTIONS) with neither header is allowed (plain navigations, curl).

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export type BodyRule =
  /** JSON endpoint: Content-Type must be application/json. */
  | "json"
  /** Body optional (BFF proxy); when there is a Content-Type it must be application/json. */
  | "optional-json"
  /** No body expected; Content-Type is ignored. */
  | "none";

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function crossOriginRefused(): NextResponse {
  return errorResponse(403, "FORBIDDEN", "Cross-origin request refused");
}

export function unsupportedMediaType(): NextResponse {
  return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
}

/** `application/json`, with or without parameters (`; charset=utf-8`). */
export function isJsonContentType(value: string | null): boolean {
  return value?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function hostOf(origin: string): string | undefined {
  try {
    return new URL(origin).host;
  } catch {
    return undefined; // includes the opaque "null" origin (sandboxed iframes, data: URLs)
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const safe = SAFE_METHODS.has(request.method.toUpperCase());
  const origin = request.headers.get("origin");
  if (!origin && !safe) return false;

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin" || (safe && fetchSite === "none");
  return !origin || hostOf(origin) === new URL(request.url).host;
}

/**
 * The first check of every `/api/*` handler: a 403 for a cross-origin request, a 415 for a body
 * that isn't JSON (per `body`), or `undefined` to carry on.
 */
export function guardApiRequest(request: Request, body: BodyRule): NextResponse | undefined {
  if (!isSameOriginRequest(request)) return crossOriginRefused();

  const contentType = request.headers.get("content-type");
  if (body === "json" && !isJsonContentType(contentType)) return unsupportedMediaType();
  if (body === "optional-json" && contentType !== null && !isJsonContentType(contentType)) {
    return unsupportedMediaType();
  }
  return undefined;
}
