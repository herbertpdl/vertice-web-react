import { apiClient, apiErrorFrom } from "./client";
import type { components } from "./schema";
import { isMaskedCpf } from "./students";
import type { Consent, Me, SessionUser } from "./types";

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
  return authRequest<{ user: SessionUser }>("/api/auth/login", input);
}

/** Trainer self-sign-up. The route handler sets `role: "TRAINER"` itself. */
export function register(input: {
  name: string;
  email: string;
  password: string;
  cpf: string;
  cref?: string;
  /** The Terms / Privacy Policy version the user accepted on the form (`LEGAL_VERSIONS.terms`). */
  acceptedTermsVersion: string;
  remember: boolean;
}) {
  return authRequest<{ user: SessionUser }>("/api/auth/register", input);
}

/** First access: redeem a setup token from the link the trainer shared. No session needed. */
export async function setupPassword(input: { token: string; newPassword: string }) {
  await authRequest<void>("/api/auth/password/setup", input);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export function fetchMe() {
  return apiClient.get<Me>("/auth/me");
}

/** Records the caller's own consent (self only: no user id). Returns the new consent state. */
export function recordConsent(input: components["schemas"]["ConsentRequest"]) {
  return apiClient.post<Consent>("/auth/me/consent", input);
}

/**
 * `PATCH /auth/me`: only the fields to change (an omitted one keeps its stored value). `null`
 * clears `cref` (or, for a non-trainer, `cpf`). A masked CPF (what `GET /auth/me` returns) is
 * dropped rather than sent, so it can never overwrite the real one.
 */
export type UpdateMeInput = components["schemas"]["UpdateMeRequest"];

export function updateMe(input: UpdateMeInput) {
  const { cpf, ...rest } = input;
  const keep = cpf === undefined || (cpf !== null && isMaskedCpf(cpf));
  const body: UpdateMeInput = keep ? rest : { ...rest, cpf };
  return apiClient.patch<Me>("/auth/me", body);
}

/**
 * `GET /auth/me/export`: the caller's data as the JSON file the BFF names (UTC date). 413
 * TOO_LARGE over vertice-api's export bounds; 429 RATE_LIMITED (with `retryAfter`) past the
 * per-user hourly limit.
 */
export function exportMyData() {
  return apiClient.download("/auth/me/export", "vertice-dados.json");
}

/**
 * `DELETE /auth/me` with the current password: deletes the caller's own account. 400
 * INVALID_CURRENT_PASSWORD is a wrong password (the session is still valid, not a logout); 409
 * ACTIVE_CLIENTS a trainer with clients still linked. On success every token of the account stops
 * working, but the web's session cookie is still set: call `logout()` next.
 */
export async function deleteAccount(password: string): Promise<void> {
  const body: components["schemas"]["DeleteAccountRequest"] = { password };
  await apiClient.delete<void>("/auth/me", body);
}
