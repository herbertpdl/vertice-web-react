import { ApiError } from "@/lib/api/client";
import type { FeatureFlag } from "@/lib/api/types";

/**
 * The feature-flags pages' pure rules and copy (feature-flags spec §4, §5). Generic for every flag
 * (D1): nothing here knows a flag by name, and the only per-flag text is its description, shown as
 * the BFF sends it.
 */

/** Trimmed, lower-cased in pt-BR, accents removed: "Exercício" and "exercicio" match. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
}

/** D8: a substring of the key or the description, ignoring case and accents. Blank `q`: all. */
export function filterFeatureFlags(flags: FeatureFlag[], q: string): FeatureFlag[] {
  const needle = fold(q.trim());
  if (!needle) return flags;
  return flags.filter((flag) => fold(flag.key).includes(needle) || fold(flag.description).includes(needle));
}

/** The list's "CONFIGURAÇÃO PRÓPRIA" column. */
export function userCountLabel(count: number): string {
  if (count === 0) return "Nenhum usuário";
  return count === 1 ? "1 usuário" : `${count} usuários`;
}

/** The list's footer: "2 flags", or "1 de 2 flags" while a search hides some (noun follows `total`). */
export function flagCountLabel(shown: number, total: number): string {
  const noun = total === 1 ? "flag" : "flags";
  return shown === total ? `${total} ${noun}` : `${shown} de ${total} ${noun}`;
}

/** A user number as every flag screen shows it: plain text, no separator, never a link (D7). */
export function userLabel(userId: number): string {
  return `Usuário #${String(userId)}`;
}

/** "Ligado" / "Desligado", next to every switch. */
export function stateLabel(enabled: boolean): string {
  return enabled ? "Ligado" : "Desligado";
}

export function everyoneToast(key: string, enabled: boolean): string {
  return `A flag ${key} foi ${enabled ? "ligada" : "desligada"} para todos.`;
}

export function userSetToast(userId: number, enabled: boolean): string {
  return `${userLabel(userId)} definido como ${stateLabel(enabled)}.`;
}

export function userRemovedToast(userId: number): string {
  return `${userLabel(userId)} agora segue a configuração para todos.`;
}

export const FLAG_SAVE_FAILED_MESSAGE = "Não foi possível salvar. Tente de novo.";
export const FLAG_GONE_MESSAGE = "Esta flag não existe mais. A lista foi atualizada.";

/** A write's 404: developers removed the flag (E9). */
export function isFlagGone(error: unknown): boolean {
  return error instanceof ApiError && error.code === "NOT_FOUND";
}

/** D10: the "flag gone" copy for `NOT_FOUND`, the generic save failure for anything else. */
export function flagSaveErrorMessage(error: unknown): string {
  return isFlagGone(error) ? FLAG_GONE_MESSAGE : FLAG_SAVE_FAILED_MESSAGE;
}

/** The detail page's link (the key encoded as one path segment). */
export function featureFlagPath(key: string): string {
  return `/painel/flags/${encodeURIComponent(key)}`;
}
