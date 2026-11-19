import type { AdminUserFilters } from "@/lib/api/admin";
import type { AdminActionEntry, AdminDirectoryRole } from "@/lib/api/types";
import { formatDateNumeric, formatInstantDate, todayLocalIso } from "@/lib/format";
import { ADMIN_SEARCH_MAX } from "@/lib/validation/bounds";

/** A user's admin profile page. */
export const profilePath = (id: number) => `/painel/usuarios/${id}`;

/** The directory's role labels, keyed by the contract's union (an admin is never listed). */
export const roleLabels: Record<AdminDirectoryRole, string> = {
  TRAINER: "Treinador",
  CLIENT: "Aluno",
};

export function statusLabel(suspended: boolean): string {
  return suspended ? "Suspenso" : "Ativo";
}

/** "1 aluno", "12 alunos". */
export function clientCountLabel(count: number): string {
  return count === 1 ? "1 aluno" : `${count} alunos`;
}

/** `lastActiveOn` (a business date): "Hoje", "31/10/2026", or "Nunca" when never active. */
export function lastActiveLabel(lastActiveOn: string | null, today: string = todayLocalIso()): string {
  if (lastActiveOn === null) return "Nunca";
  return lastActiveOn === today ? "Hoje" : formatDateNumeric(lastActiveOn);
}

/**
 * The directory's filters in the URL (admin-panel spec W14): `?papel=treinador|aluno`,
 * `?status=ativo|suspenso`, `?q=`. Anything else is ignored, so a hand-edited URL never reaches
 * the BFF as a 400.
 */
const ROLE_PARAM: Record<string, AdminDirectoryRole> = { treinador: "TRAINER", aluno: "CLIENT" };
const STATUS_PARAM: Record<string, NonNullable<AdminUserFilters["status"]>> = {
  ativo: "ACTIVE",
  suspenso: "SUSPENDED",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** The search as the BFF takes it: trimmed, at most `ADMIN_SEARCH_MAX` UTF-16 units. */
export function normalizeSearch(q: string): string {
  return q.trim().slice(0, ADMIN_SEARCH_MAX).trim();
}

export function userFiltersFromParams(params: SearchParams): AdminUserFilters {
  const role = ROLE_PARAM[first(params.papel) ?? ""];
  const status = STATUS_PARAM[first(params.status) ?? ""];
  const q = normalizeSearch(first(params.q) ?? "");
  return { ...(role && { role }), ...(status && { status }), ...(q && { q }) };
}

export function userFiltersToSearch(filters: AdminUserFilters): string {
  const params = new URLSearchParams();
  const role = Object.entries(ROLE_PARAM).find(([, value]) => value === filters.role)?.[0];
  const status = Object.entries(STATUS_PARAM).find(([, value]) => value === filters.status)?.[0];
  if (role) params.set("papel", role);
  if (status) params.set("status", status);
  if (filters.q) params.set("q", filters.q);
  const search = params.toString();
  return search ? `?${search}` : "";
}

const cannotSignIn: Record<AdminDirectoryRole, string> = {
  TRAINER: "O treinador não consegue entrar enquanto estiver suspenso.",
  CLIENT: "O aluno não consegue entrar enquanto estiver suspenso.",
};

/**
 * The suspended profile's banner (frame `d4tAve`; admin-panel spec §7): the date, the admin and
 * the reason from the newest `SUSPEND_USER` history entry, or `suspendedAt` alone while that entry
 * is loading or missing (an entry without a reason just leaves "Motivo" out).
 */
export function suspensionNotice(
  user: { role: AdminDirectoryRole; suspendedAt: string | null },
  entry: AdminActionEntry | undefined,
): string {
  const parts: string[] = [];
  const at = entry?.createdAt ?? user.suspendedAt;
  const when = at ? ` em ${formatInstantDate(at)}` : "";
  parts.push(entry ? `Suspenso${when} por ${entry.admin.name}.` : `Suspenso${when}.`);
  if (entry?.reason) parts.push(`Motivo: ${entry.reason.replace(/[.\s]+$/, "")}.`);
  parts.push(cannotSignIn[user.role]);
  return parts.join(" ");
}
