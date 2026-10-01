import { z } from "zod";

export const exerciseSchema = z.object({
  name: z.string().min(1, "Informe o nome do exercício"),
  // The one rule mirrored client-side (the server enforces it too).
  muscleGroupIds: z
    .array(z.number().int().positive())
    .min(1, "Selecione pelo menos um grupo muscular"),
  description: z.string(),
  videoUrl: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseSchema>;
