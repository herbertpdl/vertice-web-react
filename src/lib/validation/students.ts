import { z } from "zod";
import type { UpdateStudentInput } from "@/lib/api/students";
import type { ClientDetail } from "@/lib/api/types";
import { isValidCpf, onlyDigits } from "./cpf";
import { NAME_MAX, emailField, requiredText } from "./bounds";

export const studentSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome"),
  email: emailField(),
  cpf: z
    .string()
    .min(1, "Informe o CPF")
    .refine(isValidCpf, "CPF inválido"),
});

export type StudentInput = z.infer<typeof studentSchema>;

/**
 * Editing a client ("Editar aluno"). `newCpf` starts empty: every client response carries the
 * masked CPF, so the form never holds it. Empty keeps the stored CPF, typed replaces it, and
 * `removeCpf` clears it (`null`).
 */
export const editStudentSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome"),
  email: emailField(),
  newCpf: z.string().refine((value) => value === "" || isValidCpf(value), "CPF inválido"),
  removeCpf: z.boolean(),
});

export type EditStudentInput = z.infer<typeof editStudentSchema>;

export function editStudentDefaults(student: Pick<ClientDetail, "name" | "email">): EditStudentInput {
  return { name: student.name, email: student.email, newCpf: "", removeCpf: false };
}

/**
 * The `PATCH /clients/:id` body (vertice-bff `docs/api-contract.md`): `name` and `email` always
 * (required there), `cpf` only when the trainer typed a new one (digits) or removed it (`null`).
 * Left out, the BFF keeps the stored CPF; the masked one is never sent.
 */
export function editStudentBody(values: EditStudentInput): UpdateStudentInput {
  const body: UpdateStudentInput = { name: values.name.trim(), email: values.email.trim() };
  if (values.removeCpf) return { ...body, cpf: null };
  const cpf = onlyDigits(values.newCpf);
  return cpf ? { ...body, cpf } : body;
}
