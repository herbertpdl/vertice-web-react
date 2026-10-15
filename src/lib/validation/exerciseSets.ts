import { z } from "zod";
import {
  LOAD_PERCENTAGE_PATTERN,
  NOTES_MAX,
  WEIGHT_PATTERN,
  boundedText,
  durationSeconds,
  loadPercentageMessage,
  optionalDecimal,
  orderNumber,
  repsCount,
  restSeconds,
  weightMessage,
} from "./bounds";

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
  setNumber: orderNumber,
  reps: repsCount.optional(),
  durationSeconds: durationSeconds.optional(),
  weight: optionalDecimal(WEIGHT_PATTERN, weightMessage),
  loadPercentage: optionalDecimal(LOAD_PERCENTAGE_PATTERN, loadPercentageMessage),
  strategy: setStrategySchema,
  restSeconds: restSeconds.optional(),
  notes: boundedText(NOTES_MAX).optional(),
});

export type ExerciseSetFormInput = z.infer<typeof exerciseSetSchema>;

export const workoutExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  order: orderNumber,
  restSecondsBetweenSets: restSeconds,
  notes: boundedText(NOTES_MAX),
});

export type WorkoutExerciseFormInput = z.infer<typeof workoutExerciseSchema>;
