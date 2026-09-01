import { z } from "zod";
import { isValidCpf } from "./cpf";

export const studentSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  cpf: z
    .string()
    .min(1, "Informe o CPF")
    .refine(isValidCpf, "CPF inválido"),
});

export type StudentInput = z.infer<typeof studentSchema>;
