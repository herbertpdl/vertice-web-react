import { z } from "zod";
import type { UpdateMeInput } from "@/lib/api/auth";
import type { Me } from "@/lib/api/types";
import { isValidCpf, onlyDigits } from "./cpf";

/**
 * "Meu perfil". `newCpf` starts empty: `GET /auth/me` only has the masked CPF, so the form never
 * holds it. Left empty, the stored CPF stays; typed, it replaces it.
 */
export const profileSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: z.string().trim().min(1, "Informe o e-mail").email("E-mail inválido"),
  newCpf: z.string().refine((value) => value === "" || isValidCpf(value), "CPF inválido"),
  cref: z.string(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function profileDefaults(me: Pick<Me, "name" | "email" | "cref">): ProfileInput {
  return { name: me.name, email: me.email, newCpf: "", cref: me.cref };
}

/**
 * The `PATCH /auth/me` body for `values`: only what differs from `me`. The CPF goes only when the
 * user typed a new one (digits only), so the masked value is never sent; `cref` is a trainer's only
 * and an emptied one is `null` (cleared). Empty when nothing changed.
 */
export function profileChanges(me: Me, values: ProfileInput): UpdateMeInput {
  const changes: UpdateMeInput = {};
  const name = values.name.trim();
  const email = values.email.trim().toLowerCase();
  if (name !== me.name) changes.name = name;
  if (email !== me.email.toLowerCase()) changes.email = email;
  const cpf = onlyDigits(values.newCpf);
  if (cpf) changes.cpf = cpf;
  if (me.role === "TRAINER") {
    const cref = values.cref.trim();
    if (cref !== me.cref) changes.cref = cref === "" ? null : cref;
  }
  return changes;
}
