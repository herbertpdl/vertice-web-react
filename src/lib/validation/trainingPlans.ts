import { z } from "zod";

export const planLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const planLevelLabels: Record<z.infer<typeof planLevelSchema>, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const trainingPlanSchema = z
  .object({
    name: z.string().min(1, "Informe o nome do plano"),
    description: z.string(),
    startDate: isoDate.min(1, "Informe a data de início"),
    endDate: isoDate.min(1, "Informe a data de término"),
    level: planLevelSchema,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "A data de término deve ser depois da data de início",
    path: ["endDate"],
  });

export type TrainingPlanFormInput = z.infer<typeof trainingPlanSchema>;
