import { apiClient } from "./client";
import type { StudentOverview, StudentDetailOverview, User } from "./types";

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

export function createStudent(input: CreateStudentInput) {
  return apiClient.post<User>("/clients", input);
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
