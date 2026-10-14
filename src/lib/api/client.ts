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

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  const { query, ...rest } = init ?? {};
  const search = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined) as [string, string][],
      ).toString()
    : "";

  const res = await fetch(`/api/bff${path}${search}`, {
    ...rest,
    headers: {
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
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
    throw error;
  }

  return data as T;
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
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
