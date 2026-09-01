import "server-only";

export function bffUrl(path: string): string {
  const base = process.env.BFF_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api${path.startsWith("/") ? path : `/${path}`}`;
}

export interface BffErrorBody {
  error: { code: string; message: string; details?: unknown };
}
