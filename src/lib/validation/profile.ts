import { z } from "zod";
import type { UpdateMeInput } from "@/lib/api/auth";
import type { Me } from "@/lib/api/types";
import { maskPhone } from "@/lib/masks/phone";
import { isValidCpf, onlyDigits } from "./cpf";
import { CREF_MAX, NAME_MAX, boundedText, emailField, requiredText } from "./bounds";

/**
 * "Meu perfil". `newCpf` starts empty: `GET /auth/me` only has the masked CPF, so the form never
 * holds it. Left empty, the stored CPF stays; typed, it replaces it.
 */
export const profileSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome"),
  email: emailField(),
  newCpf: z.string().refine((value) => value === "" || isValidCpf(value), "CPF inválido"),
  cref: boundedText(CREF_MAX),
  // A trainer's contacts for their clients (R4, R5): optional, each with its own switch, checked
  // like vertice-bff's `UpdateMeRequest`.
  whatsapp: z
    .string()
    .refine((value) => /^(\d{10,11})?$/.test(onlyDigits(maskPhone(value))), "Informe DDD e número (10 ou 11 dígitos)"),
  instagram: z
    .string()
    .refine((value) => /^([A-Za-z0-9._]{1,30})?$/.test(value.trim().replace(/^@/, "")), "Informe o usuário do Instagram"),
  showEmail: z.boolean(),
  showWhatsapp: z.boolean(),
  showInstagram: z.boolean(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function profileDefaults(
  me: Pick<Me, "name" | "email" | "cref" | "whatsapp" | "instagram" | "showEmail" | "showWhatsapp" | "showInstagram">,
): ProfileInput {
  return {
    name: me.name,
    email: me.email,
    newCpf: "",
    cref: me.cref,
    whatsapp: maskPhone(me.whatsapp),
    instagram: me.instagram,
    showEmail: me.showEmail,
    showWhatsapp: me.showWhatsapp,
    showInstagram: me.showInstagram,
  };
}

/**
 * The `PATCH /auth/me` body for `values`: only what differs from `me`. The CPF goes only when the
 * user typed a new one (digits only), so the masked value is never sent; `cref` and the contacts are
 * a trainer's only, and an emptied one is `null` (cleared). Empty when nothing changed.
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
    // Through the mask: a pasted "+55 11 98765-4321" is stored without the country code.
    const whatsapp = onlyDigits(maskPhone(values.whatsapp));
    if (whatsapp !== me.whatsapp) changes.whatsapp = whatsapp === "" ? null : whatsapp;
    const instagram = values.instagram.trim().replace(/^@/, "");
    if (instagram !== me.instagram) changes.instagram = instagram === "" ? null : instagram;
    if (values.showEmail !== me.showEmail) changes.showEmail = values.showEmail;
    if (values.showWhatsapp !== me.showWhatsapp) changes.showWhatsapp = values.showWhatsapp;
    if (values.showInstagram !== me.showInstagram) changes.showInstagram = values.showInstagram;
  }
  return changes;
}
