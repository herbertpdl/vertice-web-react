import "server-only";
import { NextResponse } from "next/server";
import { forwardedFor, resolveTrustedProxyHops } from "./forwardedFor";

export function bffUrl(path: string): string {
  const base = process.env.BFF_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api${path.startsWith("/") ? path : `/${path}`}`;
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
  // Throws in production when TRUSTED_PROXY_HOPS is unset: no BFF call goes out with an
  // address a browser may have chosen.
  const xff = forwardedFor(
    request.headers.get("x-forwarded-for"),
    resolveTrustedProxyHops(process.env),
  );
  return xff ? { ...extra, "X-Forwarded-For": xff } : extra;
}

// Statuses whose Response must have a null body (the constructor throws on "").
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

/**
 * Relays a BFF response as-is: status, body, Content-Type and `Retry-After` (sent with
 * 429 RATE_LIMITED, which the forms turn into "tente novamente em …").
 */
export async function relayBffResponse(res: Response): Promise<NextResponse> {
  const headers: Record<string, string> = {};
  const retryAfter = res.headers.get("Retry-After");
  if (retryAfter) headers["Retry-After"] = retryAfter;

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
