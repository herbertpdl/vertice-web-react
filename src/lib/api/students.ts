import { apiClient } from "./client";
import type {
  CreatedStudent,
  PasswordSetup,
  StudentOverview,
  StudentDetailOverview,
  User,
} from "./types";

// vertice-bff mounts this resource under /api/clients (its internal module
// name), even though the REST shape it returns is the trainer's "students"
// list — hence the naming mismatch between this file and the URL path.

export function fetchStudents() {
  return apiClient.get<StudentOverview[]>("/clients");
}

export function fetchStudent(id: number) {
  return apiClient.get<User>(`/clients/${id}`);
}

export function fetchStudentOverview(id: number) {
  return apiClient.get<StudentDetailOverview>(`/clients/${id}/overview`);
}

export interface CreateStudentInput {
  name: string;
  email: string;
  cpf: string;
}

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

export interface UpdateStudentInput {
  name: string;
  email: string;
  cpf?: string;
}

export function updateStudent(id: number, input: UpdateStudentInput) {
  return apiClient.patch<User>(`/clients/${id}`, input);
}

export function deleteStudent(id: number) {
  return apiClient.delete<void>(`/clients/${id}`);
}
