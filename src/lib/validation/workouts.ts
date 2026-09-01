import { z } from "zod";

export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const dayOfWeekLabels: Record<z.infer<typeof dayOfWeekSchema>, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

export const workoutSchema = z.object({
  name: z.string().min(1, "Informe o nome do treino"),
  dayOfWeek: dayOfWeekSchema,
});

export type WorkoutFormInput = z.infer<typeof workoutSchema>;
