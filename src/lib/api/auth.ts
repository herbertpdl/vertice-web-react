import { apiClient, apiErrorFrom } from "./client";
import type { User } from "./types";

// These go to this app's own /api/auth/* route handlers (not the /api/bff proxy): they set or
// clear the session cookie, or need no session at all. Failures throw an ApiError, so callers
// can tell RATE_LIMITED (with `retryAfter`) and INVALID_SETUP_TOKEN apart.
async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }
  if (!res.ok) {
    const error = apiErrorFrom(res, data);
    if (error.code === "UNKNOWN_ERROR") error.message = "Falha na autenticação";
    throw error;
  }
  return data as T;
}

export function login(input: { email: string; password: string; remember: boolean }) {
  return authRequest<{ user: User }>("/api/auth/login", input);
}

/** Trainer self-sign-up. The route handler sets `role: "TRAINER"` itself. */
export function register(input: {
  name: string;
  email: string;
  password: string;
  cpf: string;
  cref?: string;
  remember: boolean;
}) {
  return authRequest<{ user: User }>("/api/auth/register", input);
}

/** First access: redeem a setup token from the link the trainer shared. No session needed. */
export async function setupPassword(input: { token: string; newPassword: string }) {
  await authRequest<void>("/api/auth/password/setup", input);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiClient.get<User>("/auth/me");
}
