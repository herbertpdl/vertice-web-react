import "server-only";
import { NextResponse } from "next/server";
import { serverEnv } from "./env.server";
import { forwardedFor } from "./forwardedFor";

export function bffUrl(path: string): string {
  return `${serverEnv().bffUrl}/api${path.startsWith("/") ? path : `/${path}`}`;
}

function decoded(segment: string): string | undefined {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

/**
 * The upstream path for `segments` (`/clients/4`), each one percent-encoded, or `undefined` when a
 * segment could step out of the path it names: empty, `.`, `..`, or containing `/` or `\` once
 * decoded. Next hands the route already-decoded segments (`..%2Fhealth` arrives as `../health`);
 * the second decode catches double-encoding (`..%252Fhealth`).
 */
export function bffProxyPath(segments: string[]): string | undefined {
  const encoded: string[] = [];
  for (const segment of segments) {
    const plain = decoded(segment) ?? segment;
    for (const form of [segment, plain]) {
      if (form === "" || form === "." || form === ".." || /[/\\]/.test(form)) return undefined;
    }
    encoded.push(encodeURIComponent(segment));
  }
  return `/${encoded.join("/")}`;
}

/**
 * Headers every server-side BFF call carries: `extra` plus `X-Forwarded-For` with the browser's
 * address (one entry), so the BFF's per-IP rate limits see each web user rather than this server. See
 * `forwardedFor.ts` for which entry that is and `TRUSTED_PROXY_HOPS` in `.env.local.example`.
 */
export function bffHeaders(
  request: Request,
  extra: Record<string, string> = {},
): Record<string, string> {
  // `serverEnv()` throws in production when TRUSTED_PROXY_HOPS is unset: no BFF call goes out
  // with an address a browser may have chosen.
  const xff = forwardedFor(request.headers.get("x-forwarded-for"), serverEnv().trustedProxyHops);
  return xff ? { ...extra, "X-Forwarded-For": xff } : extra;
}

// Statuses whose Response must have a null body (the constructor throws on "").
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Relays a BFF response as-is: status, body, Content-Type, `Retry-After` (sent with
 * 429 RATE_LIMITED, which the forms turn into "tente novamente em …") and, on a 2xx,
 * `Content-Disposition` (`GET /auth/me/export`'s file name). Caching is not relayed: the route handlers set `no-store`
 * themselves (`withNoStore`).
 */
export async function relayBffResponse(res: Response): Promise<NextResponse> {
  const headers: Record<string, string> = {};
  const retryAfter = res.headers.get("Retry-After");
  if (retryAfter) headers["Retry-After"] = retryAfter;
  // Only a success names a file: an error body is never offered as a download.
  const disposition = res.ok ? res.headers.get("Content-Disposition") : null;
  if (disposition) headers["Content-Disposition"] = disposition;

  if (NULL_BODY_STATUSES.has(res.status)) {
    return new NextResponse(null, { status: res.status, headers });
  }
  headers["Content-Type"] = res.headers.get("Content-Type") ?? "application/json";
  return new NextResponse(await res.text(), { status: res.status, headers });
}

/** The request's JSON body, or `undefined` when it isn't JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function validationError(details?: unknown): NextResponse {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "Dados inválidos", details } },
    { status: 400 },
  );
}

export interface BffErrorBody {
  error: { code: string; message: string; details?: unknown };
}
