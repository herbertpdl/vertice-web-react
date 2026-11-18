import { Badge } from "@/components/ui";
import { roleLabels, statusLabel } from "@/lib/admin/users";
import type { AdminDirectoryRole } from "@/lib/api/types";

/** "Treinador" (info) or "Aluno" (neutral), as the admin frames show them. */
export function RoleBadge({ role }: { role: AdminDirectoryRole }) {
  return <Badge variant={role === "TRAINER" ? "info" : "neutral"}>{roleLabels[role]}</Badge>;
}

/** "Ativo" (success) or "Suspenso" (danger); admin-panel spec W12. */
export function StatusBadge({ suspended }: { suspended: boolean }) {
  return <Badge variant={suspended ? "danger" : "success"}>{statusLabel(suspended)}</Badge>;
}
