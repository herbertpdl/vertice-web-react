import type { BadgeVariant } from "@/components/ui/Badge";
import type { AdminAction, AdminActionEntry } from "@/lib/api/types";

/**
 * The history's action labels (admin-panel spec §6, W18): one map keyed by the contract's
 * `AdminAction` union, so an action the BFF adds fails typecheck here instead of showing a raw code.
 */
export const actionLabels: Record<AdminAction, string> = {
  VIEW_USER_PROFILE: "Abriu perfil",
  SUSPEND_USER: "Suspendeu usuário",
  REACTIVATE_USER: "Reativou usuário",
  SEND_FIRST_ACCESS_EMAIL: "E-mail de primeiro acesso",
  SEND_PASSWORD_RESET_EMAIL: "E-mail de redefinição de senha",
  END_RELATIONSHIP: "Encerrou vínculo",
  CHANGE_OWN_PASSWORD: "Alterou a própria senha",
  CREATE_STARTER_EXERCISE: "Criou exercício",
  UPDATE_STARTER_EXERCISE: "Editou exercício",
  DELETE_STARTER_EXERCISE: "Excluiu exercício",
  PROMOTE_EXERCISE: "Promoveu exercício",
  CREATE_MUSCLE_GROUP: "Criou grupo muscular",
  RENAME_MUSCLE_GROUP: "Renomeou grupo muscular",
};

/** Every action, in the label map's order (the "Ação" filter's options). */
export const ADMIN_ACTIONS = Object.keys(actionLabels) as AdminAction[];

/**
 * The badge color of each action (frame `TExWT`): red for the ones that take something away,
 * amber for a promotion, green for a reactivation, neutral for reads and e-mails.
 */
export const actionTones: Record<AdminAction, BadgeVariant> = {
  VIEW_USER_PROFILE: "neutral",
  SUSPEND_USER: "danger",
  REACTIVATE_USER: "success",
  SEND_FIRST_ACCESS_EMAIL: "neutral",
  SEND_PASSWORD_RESET_EMAIL: "neutral",
  END_RELATIONSHIP: "danger",
  CHANGE_OWN_PASSWORD: "neutral",
  CREATE_STARTER_EXERCISE: "primary",
  UPDATE_STARTER_EXERCISE: "primary",
  DELETE_STARTER_EXERCISE: "danger",
  PROMOTE_EXERCISE: "warning",
  CREATE_MUSCLE_GROUP: "primary",
  RENAME_MUSCLE_GROUP: "primary",
};

const CATALOG_ACTIONS: ReadonlySet<AdminAction> = new Set([
  "CREATE_STARTER_EXERCISE",
  "UPDATE_STARTER_EXERCISE",
  "DELETE_STARTER_EXERCISE",
  "CREATE_MUSCLE_GROUP",
  "RENAME_MUSCLE_GROUP",
]);

/** The "Motivo / detalhe" column (spec §6); "—" when there is nothing to say. */
export function actionDetail(entry: AdminActionEntry): string {
  switch (entry.action) {
    case "SUSPEND_USER":
    case "REACTIVATE_USER":
      return entry.reason || "—";
    case "END_RELATIONSHIP":
      return entry.relatedUser ? `Vínculo com ${entry.relatedUser.name} encerrado.` : "—";
    case "PROMOTE_EXERCISE":
      return entry.subjectLabel ? `"${entry.subjectLabel}" copiado para o catálogo inicial.` : "—";
    default:
      return CATALOG_ACTIONS.has(entry.action) && entry.subjectLabel ? `"${entry.subjectLabel}"` : "—";
  }
}

/** The name the BFF gives a deleted account (R72): shown as is, with no link to a profile. */
export const DELETED_USER_NAME = "Usuário removido";
