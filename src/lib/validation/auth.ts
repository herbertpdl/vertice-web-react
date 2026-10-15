import { z } from "zod";
import { isValidCpf, onlyDigits } from "./cpf";
import { CREF_MAX, NAME_MAX, boundedText, emailField, requiredText, tooLong } from "./bounds";

// vertice-api's password policy, mirrored by the BFF: at least 8 characters, at most 72 UTF-8
// bytes (bcrypt's input limit), not blank. Applies wherever a password is chosen, not to login
// (accounts may predate the policy).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

const utf8Length = (value: string) => new TextEncoder().encode(value).length;

export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres`)
  .refine((value) => utf8Length(value) <= PASSWORD_MAX_BYTES, "A senha é longa demais")
  .refine((value) => value.trim().length > 0, "A senha não pode ser só espaços");

export const PASSWORD_HELP_TEXT = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres.`;

const emailSchema = emailField();
const cpfSchema = z.string().min(1, "Informe o CPF").max(20, tooLong(20)).refine(isValidCpf, "CPF inválido");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha"),
  remember: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: requiredText(NAME_MAX, "Informe o nome"),
    email: emailSchema,
    cpf: cpfSchema,
    cref: boundedText(CREF_MAX).optional(),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
    terms: z.literal(true, {
      message: "É necessário aceitar os termos de uso",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// What the browser posts to this app's /api/auth/* route handlers, re-checked server-side before
// anything is sent to the BFF. Unknown keys (e.g. a `role`) are stripped.

export const loginRequestSchema = loginSchema.extend({ remember: z.boolean().optional() });

export const registerRequestSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome"),
  email: emailSchema,
  cpf: cpfSchema.transform(onlyDigits),
  cref: z.string().max(CREF_MAX).trim().optional(),
  password: newPasswordSchema,
  // The Terms / Privacy Policy version accepted on the form (P1-04), vertice-api's format.
  acceptedTermsVersion: z.string().regex(/^[A-Za-z0-9._-]{1,32}$/),
  remember: z.boolean().optional(),
});

export const setPasswordSchema = z
  .object({
    newPassword: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type SetPasswordInput = z.infer<typeof setPasswordSchema>;

export const passwordSetupRequestSchema = z.object({
  token: z.string().min(1).max(512),
  newPassword: newPasswordSchema,
});
