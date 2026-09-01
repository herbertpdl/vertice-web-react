import { z } from "zod";

export const setStrategySchema = z.enum([
  "STRAIGHT",
  "WARM_UP",
  "BACKOFF",
  "DROPSET",
  "REST_PAUSE",
  "CLUSTER",
  "AMRAP",
  "ISOMETRIC_HOLD",
  "FAILURE",
]);

export type SetStrategyFormInput = z.infer<typeof setStrategySchema>;

export const setStrategyLabels: Record<SetStrategyFormInput, string> = {
  STRAIGHT: "Direta",
  WARM_UP: "Aquecimento",
  BACKOFF: "Backoff",
  DROPSET: "Dropset",
  REST_PAUSE: "Rest-Pause",
  CLUSTER: "Cluster",
  AMRAP: "AMRAP",
  ISOMETRIC_HOLD: "Isometria",
  FAILURE: "Falha",
};

export const exerciseSetSchema = z.object({
  setNumber: z.number().int().positive(),
  reps: z.number().int().min(0).optional(),
  durationSeconds: z.number().int().min(0).optional(),
  weight: z.string().optional(),
  loadPercentage: z.string().optional(),
  strategy: setStrategySchema,
  restSeconds: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

export type ExerciseSetFormInput = z.infer<typeof exerciseSetSchema>;

export const workoutExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  order: z.number().int().min(0),
  restSecondsBetweenSets: z.number().int().min(0),
  notes: z.string(),
});

export type WorkoutExerciseFormInput = z.infer<typeof workoutExerciseSchema>;
