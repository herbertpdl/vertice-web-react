import { apiClient } from "./client";
import type { components } from "./schema";
import type {
  ClientDetail,
  ClientSummary,
  CreatedStudent,
  PasswordSetup,
  StudentDetailOverview,
} from "./types";

// vertice-bff mounts this resource under /api/clients (its internal module
// name), even though the REST shape it returns is the trainer's "students"
// list — hence the naming mismatch between this file and the URL path.

export function fetchStudents() {
  return apiClient.get<ClientSummary[]>("/clients");
}

/**
 * The client, CPF masked. `revealCpf` asks for the full CPF (`?reveal=cpf`; the BFF logs every
 * reveal): never call it from a `queryFn`, so the full value stays out of the query cache. Use
 * `revealStudentCpf`.
 */
export function fetchStudent(id: number, { revealCpf = false }: { revealCpf?: boolean } = {}) {
  return apiClient.get<ClientDetail>(`/clients/${id}`, revealCpf ? { reveal: "cpf" } : undefined);
}

/** The client's full CPF, for the "mostrar" toggle only. Keep it in component state. */
export async function revealStudentCpf(id: number): Promise<string> {
  return (await fetchStudent(id, { revealCpf: true })).cpf;
}

/** A CPF as the BFF masks it (`***.***.***-25`): display only, never a value to send back. */
export function isMaskedCpf(cpf: string): boolean {
  return cpf.includes("*");
}

export function fetchStudentOverview(id: number) {
  return apiClient.get<StudentDetailOverview>(`/clients/${id}/overview`);
}

/** `cpf` is optional in the contract; this app's form always collects one (`src/lib/validation/students.ts`). */
export type CreateStudentInput = components["schemas"]["CreateClientRequest"];

/**
 * Creates the client without a password. `setup` is their first-access token, or `null` when the
 * client was created but issuing it failed (re-issue with `issueStudentSetupToken`).
 */
export function createStudent(input: CreateStudentInput) {
  return apiClient.post<CreatedStudent>("/clients", input);
}

/**
 * Re-issues the first-access token (the previous one stops working). 409 PRECONDITION_FAILED
 * once the client has set a password.
 */
export function issueStudentSetupToken(id: number) {
  return apiClient.post<PasswordSetup>(`/clients/${id}/setup-token`);
}

/** The link the trainer shares: the web's `/definir-senha` page with the token. */
export function setupLink(origin: string, token: string) {
  return `${origin}/definir-senha?token=${encodeURIComponent(token)}`;
}

/** `cpf`: leave out to keep the stored one; a new CPF (digits) replaces it; `null` removes it. */
export type UpdateStudentInput = components["schemas"]["UpdateClientRequest"];

/**
 * `PATCH /clients/:id`. `cpf` is optional: leave it out to keep the current one, `null` removes it.
 * A masked CPF (what every client response carries, and a 400 from the BFF) is dropped rather than
 * sent, so a form prefilled from `ClientDetail` can never overwrite the real CPF with
 * `***.***.***-25`.
 */
export function updateStudent(id: number, input: UpdateStudentInput) {
  const { cpf, ...rest } = input;
  const body =
    cpf === undefined || (cpf !== null && isMaskedCpf(cpf)) ? rest : { ...rest, cpf };
  return apiClient.patch<ClientDetail>(`/clients/${id}`, body);
}

/**
 * "Encerrar acompanhamento" (`DELETE /clients/:id`, 204): ends the trainer's relationship with the
 * client. It does not delete the client's account; the plans and the logs under them stay. A 403
 * means the client is not (or no longer) one of the trainer's.
 */
export function endStudentRelationship(id: number) {
  return apiClient.delete<void>(`/clients/${id}`);
}
