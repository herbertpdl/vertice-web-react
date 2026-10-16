import { todayLocalIso } from "@/lib/format";

/**
 * Where a training plan sits relative to today. The BFF doesn't answer a status field — it answers
 * the two business dates — so this is the one place that derives it, and `planStatusLabels` the one
 * place that names it in pt-BR (one label map per concept, keyed by the union it labels).
 */
export type PlanStatus = "scheduled" | "active" | "completed";

export const planStatusLabels: Record<PlanStatus, string> = {
  scheduled: "Agendado",
  active: "Ativo",
  completed: "Concluído",
};

/**
 * `startDate`, `endDate` and `today` are business dates (`yyyy-MM-dd`), which compare and sort as
 * plain strings — no `Date` anywhere, so nothing can drift into the host's time zone. Both ends are
 * inclusive: a plan is active on its last day. "Today" is the business day (`todayLocalIso`), not
 * the UTC one, which from 21:00 local would have called a plan ending today "Concluído" while the
 * trainer was still looking at Friday evening.
 */
export function planStatus(
  startDate: string,
  endDate: string,
  today: string = todayLocalIso(),
): PlanStatus {
  if (today < startDate) return "scheduled";
  if (today > endDate) return "completed";
  return "active";
}
