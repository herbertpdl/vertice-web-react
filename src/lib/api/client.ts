import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(body: ApiErrorBody["error"], status: number) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.details = body.details;
    this.status = status;
  }
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
    const body = data as ApiErrorBody;
    const error = new ApiError(
      body?.error ?? { code: "UNKNOWN_ERROR", message: "Something went wrong" },
      res.status,
    );
    if (res.status === 401 && typeof window !== "undefined") {
      // Plain module-level function, not a component - no router available.
      // A hard navigation also guarantees the query cache is dropped.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
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
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
