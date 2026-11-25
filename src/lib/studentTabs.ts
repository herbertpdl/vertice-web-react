/**
 * The client page's tabs and their `?aba=` values (client-anamnese spec D1, R9, R28). Closed: an
 * absent or unknown value is the plans tab.
 */
export type StudentTab = "plans" | "feedback" | "progress" | "anamnese";

export const studentTabParams: Record<StudentTab, string> = {
  plans: "planos",
  feedback: "feedbacks",
  progress: "progresso",
  anamnese: "anamnese",
};

export function studentTabFromParam(value: string | string[] | null | undefined): StudentTab {
  const param = Array.isArray(value) ? value[0] : value;
  const found = (Object.keys(studentTabParams) as StudentTab[]).find((tab) => studentTabParams[tab] === param);
  return found ?? "plans";
}

/** `/alunos/:id?aba=…` (the plans tab is the bare path). */
export function studentTabHref(clientId: number, tab: StudentTab): string {
  return tab === "plans" ? `/alunos/${clientId}` : `/alunos/${clientId}?aba=${studentTabParams[tab]}`;
}
