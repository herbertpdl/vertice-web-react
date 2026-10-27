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

/**
 * What each strategy asks of the client: what the mobile app shows when the trainer writes no
 * description of their own (the set's `notes`), and so the editor's placeholder for it. Same text
 * as vertice-mobile's `SET_STRATEGY_DESCRIPTIONS`; read it through `setStrategyDescription`, which
 * words Isometria for a set with reps (no hold button there).
 */
export const setStrategyDescriptions: Record<SetStrategyFormInput, string> = {
  STRAIGHT: "Série tradicional: faça as repetições indicadas com a mesma carga e descanse normalmente.",
  WARM_UP: "Série leve para preparar músculos e articulações. Use carga baixa e não vá até a falha.",
  BACKOFF: "Feita depois das séries mais pesadas, com carga menor, para somar volume mantendo a boa técnica.",
  DROPSET:
    "Ao terminar as repetições, reduza a carga (cerca de 20–30%) e continue na hora, sem descanso, até não conseguir mais.",
  REST_PAUSE:
    "Vá até perto da falha, descanse de 10 a 20 segundos e continue com a mesma carga por mais algumas repetições.",
  CLUSTER:
    "Divida a série em blocos curtos de repetições, com pausas de 10 a 30 segundos entre eles, mantendo a carga.",
  AMRAP: "“As many reps as possible”: faça o máximo de repetições que conseguir com boa técnica.",
  ISOMETRIC_HOLD: "Segure a posição parada pelo tempo indicado. Use o botão ▶ para cronometrar.",
  FAILURE: "Faça repetições até não conseguir completar mais nenhuma com boa técnica.",
};

/** A strategy's own description for a set: Isometria's names the hold button only on a timed set. */
export function setStrategyDescription(strategy: SetStrategyFormInput, timed: boolean): string {
  if (strategy === "ISOMETRIC_HOLD" && !timed) {
    return "Segure a posição parada por alguns segundos em cada repetição, sem mover.";
  }
  return setStrategyDescriptions[strategy];
}

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
