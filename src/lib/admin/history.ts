import type { AdminActionFilters } from "@/lib/api/admin";
import type { AdminAction } from "@/lib/api/types";
import { actionLabels } from "./actions";

/**
 * The history's filters in the URL (admin-panel spec §7): `?admin=<id>`, `?acao=<AdminAction>` and
 * `?usuario=<id>` (the affected user, set from a profile's "Histórico" link). Anything that isn't a
 * positive id or a known action is ignored, so a hand-edited URL never reaches the BFF as a 400.
 */
type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveId(value: string | undefined): number | undefined {
  if (!value || !/^[1-9]\d{0,15}$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

function isAction(value: string | undefined): value is AdminAction {
  return value !== undefined && Object.hasOwn(actionLabels, value);
}

export function historyFiltersFromParams(params: SearchParams): AdminActionFilters {
  const adminId = positiveId(first(params.admin));
  const action = first(params.acao);
  const targetUserId = positiveId(first(params.usuario));
  return {
    ...(adminId && { adminId }),
    ...(isAction(action) && { action }),
    ...(targetUserId && { targetUserId }),
  };
}

export function historyFiltersToSearch(filters: AdminActionFilters): string {
  const params = new URLSearchParams();
  if (filters.adminId) params.set("admin", String(filters.adminId));
  if (filters.action) params.set("acao", filters.action);
  if (filters.targetUserId) params.set("usuario", String(filters.targetUserId));
  const search = params.toString();
  return search ? `?${search}` : "";
}

/** The profile's link into the history, filtered to that user. */
export function historyPathFor(userId: number): string {
  return `/painel/historico${historyFiltersToSearch({ targetUserId: userId })}`;
}

/**
 * The empty state's line (frame `ZCKW9`): "Nenhuma ação de João Pires do tipo "Suspendeu
 * usuário". Ajuste ou limpe os filtros." Each filter adds its clause.
 */
export function emptyHistoryMessage(names: { admin?: string; action?: AdminAction; user?: string }): string {
  if (!names.admin && !names.action && !names.user) return "Ainda não há ações registradas.";
  let text = "Nenhuma ação";
  if (names.admin) text += ` de ${names.admin}`;
  if (names.action) text += ` do tipo "${actionLabels[names.action]}"`;
  if (names.user) text += ` sobre ${names.user}`;
  return `${text}. Ajuste ou limpe os filtros.`;
}
