import { z } from "zod";

export const muscleGroupSchema = z.enum([
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "CORE",
  "CARDIO",
]);

export const muscleGroupLabels: Record<z.infer<typeof muscleGroupSchema>, string> = {
  CHEST: "Peito",
  BACK: "Costas",
  LEGS: "Pernas",
  SHOULDERS: "Ombros",
  ARMS: "Braços",
  CORE: "Core",
  CARDIO: "Cardio",
};

export const exerciseSchema = z.object({
  name: z.string().min(1, "Informe o nome do exercício"),
  muscleGroup: muscleGroupSchema,
  description: z.string(),
  videoUrl: z
    .string()
    .url("URL inválida")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseSchema>;
