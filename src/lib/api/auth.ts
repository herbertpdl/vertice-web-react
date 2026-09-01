import { apiClient } from "./client";
import type { User, ApiErrorBody } from "./types";

async function authRequest(
  path: string,
  body: unknown,
): Promise<{ user: User }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const err = data as ApiErrorBody;
    const error = new Error(err.error?.message ?? "Falha na autenticação") as Error & {
      code?: string;
    };
    error.code = err.error?.code;
    throw error;
  }
  return data;
}

export function login(input: { email: string; password: string; remember: boolean }) {
  return authRequest("/api/auth/login", input);
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  cpf: string;
  cref?: string;
  remember: boolean;
}) {
  return authRequest("/api/auth/register", { ...input, role: "TRAINER" });
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiClient.get<User>("/auth/me");
}
