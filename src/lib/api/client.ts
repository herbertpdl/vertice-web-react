import type { ApiErrorBody } from "./types";
import { parseRetryAfter } from "./rateLimit";

// Guards against every in-flight request independently kicking off its own
// logout+redirect when a 401 arrives (e.g. auth/me and dashboard failing together).
let loggingOut = false;

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;
  /** Seconds to wait, from `Retry-After` (sent with 429 RATE_LIMITED). */
  retryAfter?: number;

  constructor(body: ApiErrorBody["error"], status: number, retryAfter?: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** Builds the ApiError for a failed response whose (possibly empty) body is already parsed. */
export function apiErrorFrom(res: Response, data: unknown): ApiError {
  const body = data as ApiErrorBody | undefined;
  return new ApiError(
    body?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" },
    res.status,
    parseRetryAfter(res.headers.get("Retry-After")),
  );
}

function bffFetch(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<Response> {
  const { query, ...rest } = init ?? {};
  const search = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
      ).toString()
    : "";

  return fetch(`/api/bff${path}${search}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });
}

/** The ApiError for a failed response; a 401 also logs out and goes to /login. */
function failure(res: Response, data: unknown): ApiError {
  const error = apiErrorFrom(res, data);
  if (res.status === 401 && typeof window !== "undefined" && !loggingOut) {
    loggingOut = true;
    // Plain module-level function, not a component - no router available.
    // A hard navigation also guarantees the query cache is dropped.
    // The session cookie is httpOnly, so it must be cleared server-side before navigating -
    // otherwise proxy.ts still sees it as present and immediately bounces /login back here,
    // causing an infinite redirect loop.
    fetch("/api/auth/logout", { method: "POST" }).finally(() => {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    });
  }
  return error;
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const res = await bffFetch(path, init);
  const text = await res.text();

  if (!res.ok) throw failure(res, parseJson(text));

  return (text ? JSON.parse(text) : undefined) as T;
}

/** A file the BFF sends as an attachment (`Content-Disposition`), e.g. the data export. */
export interface DownloadedFile {
  blob: Blob;
  /** From `Content-Disposition`'s `filename`, or `fallbackName` when it has none. */
  filename: string;
}

// A plain file name: word characters, dots and dashes, not starting with a dot, no `..`.
const SAFE_FILENAME = /^[\w-][\w.-]*$/;

/**
 * The `filename` of a `Content-Disposition: attachment; filename="…"` header, or `undefined` when
 * there is none or it is anything but a plain name (a path, `..`, spaces, non-ASCII), so the
 * caller falls back to its fixed name.
 */
export function attachmentFilename(disposition: string | null): string | undefined {
  const match = disposition?.match(/filename\s*=\s*(?:"([^"]*)"|([^;\s]+))/i);
  const name = (match?.[1] ?? match?.[2])?.trim();
  if (!name || !SAFE_FILENAME.test(name) || name.includes("..")) return undefined;
  return name;
}

async function download(path: string, fallbackName: string): Promise<DownloadedFile> {
  const res = await bffFetch(path, { method: "GET" });
  if (!res.ok) throw failure(res, parseJson(await res.text()));
  return {
    blob: await res.blob(),
    filename: attachmentFilename(res.headers.get("Content-Disposition")) ?? fallbackName,
  };
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, string | number | undefined>) =>
    request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body !== undefined ? JSON.stringify(body) : undefined }),
  /** `body` is for the few deletes that take one (`DELETE /auth/me`'s `{password}`). */
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body !== undefined ? JSON.stringify(body) : undefined }),
  download,
};
