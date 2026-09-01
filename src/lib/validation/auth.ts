import { z } from "zod";
import { isValidCpf } from "./cpf";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
  remember: z.boolean(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(1, "Informe o nome"),
    email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
    cpf: z
      .string()
      .min(1, "Informe o CPF")
      .refine(isValidCpf, "CPF inválido"),
    cref: z.string().optional(),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
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
