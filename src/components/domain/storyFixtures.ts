import type { Exercise, FullWorkout, RecentWorkoutSummary } from "@/lib/api/types";
import type { AutosaveTransport } from "@/lib/workoutEditor/autosave";
import type { EditorExercise, EditorSet } from "@/lib/workoutEditor/model";

export const supino: Exercise = {
  id: 1,
  name: "Supino Reto com Barra",
  description: "Movimento composto para desenvolvimento de força e volume.",
  videoUrl: "https://example.com/supino",
  muscleGroup: "CHEST",
};
export const puxada: Exercise = {
  id: 2,
  name: "Puxada Alta na Polia",
  description: "Movimento composto para desenvolvimento de força e volume.",
  videoUrl: "",
  muscleGroup: "BACK",
};
export const agachamento: Exercise = {
  id: 3,
  name: "Agachamento Livre",
  description: "Movimento composto para desenvolvimento de força e volume.",
  videoUrl: "https://example.com/agachamento",
  muscleGroup: "LEGS",
};

export const catalog: Exercise[] = [
  supino,
  puxada,
  agachamento,
  { id: 4, name: "Supino Inclinado com Halteres", description: "Movimento composto para desenvolvimento de força e volume.", videoUrl: "https://example.com/inclinado", muscleGroup: "CHEST" },
  { id: 5, name: "Crucifixo na Polia", description: "Movimento composto para desenvolvimento de força e volume.", videoUrl: "", muscleGroup: "CHEST" },
  { id: 6, name: "Desenvolvimento Militar", description: "Movimento composto para desenvolvimento de força e volume.", videoUrl: "https://example.com/militar", muscleGroup: "SHOULDERS" },
];

let n = 0;
const key = (prefix: string) => `${prefix}${++n}`;

export function set(fields: Partial<Omit<EditorSet, "key">> = {}): EditorSet {
  return { key: key("s"), id: null, strategy: "STRAIGHT", ...fields };
}

export function exercise(
  catalogEntry: Exercise,
  fields: Partial<Omit<EditorExercise, "key" | "exercise">> = {},
): EditorExercise {
  return {
    key: key("e"),
    id: null,
    exercise: catalogEntry,
    restSecondsBetweenSets: 60,
    notes: "",
    sets: [],
    ...fields,
  };
}

export const supinoCard: EditorExercise = exercise(supino, {
  id: 10,
  restSecondsBetweenSets: 90,
  notes: "Manter escápulas retraídas durante todo o movimento.",
  sets: [
    set({ id: 101, strategy: "WARM_UP", reps: 12, weight: "20", loadPercentage: "40", restSeconds: 60 }),
    set({ id: 102, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    set({ id: 103, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    set({ id: 104, strategy: "BACKOFF", reps: 10, weight: "50", loadPercentage: "60", restSeconds: 90 }),
  ],
});

export const puxadaCard: EditorExercise = exercise(puxada, {
  id: 11,
  restSecondsBetweenSets: 75,
  sets: [
    set({ id: 111, reps: 10, weight: "45", loadPercentage: "70", restSeconds: 75 }),
    set({ id: 112, reps: 10, weight: "45", loadPercentage: "70", restSeconds: 75 }),
    set({ id: 113, strategy: "DROPSET", weight: "45", restSeconds: 60 }),
  ],
});

export const agachamentoCard: EditorExercise = exercise(agachamento, { id: 12, restSecondsBetweenSets: 60 });

export const recentWorkouts: RecentWorkoutSummary[] = [
  { id: 42, name: "Treino A — Peito e Costas", trainingPlanId: 7, dayOfWeek: "MONDAY", studentName: "Maria Silva", planName: "Hipertrofia — Fase 1", exerciseCount: 3 },
  { id: 41, name: "Treino B — Pernas", trainingPlanId: 7, dayOfWeek: "WEDNESDAY", studentName: "Maria Silva", planName: "Hipertrofia — Fase 1", exerciseCount: 5 },
  { id: 33, name: "Full body", trainingPlanId: 5, dayOfWeek: "FRIDAY", studentName: "João Souza", planName: "Condicionamento", exerciseCount: 6 },
];

/** A transport that answers like the BFF would, without HTTP (ids by position, everything succeeds). */
export function fakeTransport(): AutosaveTransport {
  let nextId = 1000;
  const toFull = (id: number, name: string, dayOfWeek: FullWorkout["dayOfWeek"], entries: Parameters<AutosaveTransport["replace"]>[1]): FullWorkout => ({
    id,
    name,
    trainingPlanId: 7,
    dayOfWeek,
    exercises: entries.map((entry, i) => {
      const weId = ++nextId;
      return {
        id: weId,
        workoutId: id,
        exerciseId: entry.exerciseId,
        order: i + 1,
        restSecondsBetweenSets: entry.restSecondsBetweenSets ?? 0,
        notes: entry.notes ?? "",
        exercise: catalog.find((e) => e.id === entry.exerciseId) ?? supino,
        sets: (entry.sets ?? []).map((s, j) => ({
          id: ++nextId,
          workoutExerciseId: weId,
          setNumber: j + 1,
          reps: s.reps ?? 0,
          durationSeconds: s.durationSeconds ?? 0,
          weight: s.weight ?? "",
          loadPercentage: s.loadPercentage ?? "",
          strategy: s.strategy ?? "STRAIGHT",
          restSeconds: s.restSeconds ?? 0,
          notes: s.notes ?? "",
        })),
      };
    }),
  });
  const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 400));
  return {
    create: (planId, input) => delay(toFull(42, input.name, input.dayOfWeek, input.exercises ?? [])),
    replace: (workoutId, exercises) => delay(toFull(workoutId, "Treino", "MONDAY", exercises)),
    patchWorkout: () => delay({}),
    addExercise: (workoutId, input) => delay({ id: ++nextId, workoutId, exerciseId: input.exerciseId, order: input.order, restSecondsBetweenSets: input.restSecondsBetweenSets, notes: input.notes ?? "" }),
    updateExercise: () => delay({}),
    deleteExercise: () => delay(undefined),
    addSet: (workoutExerciseId, input) => delay({ id: ++nextId, workoutExerciseId, setNumber: input.setNumber, strategy: input.strategy }),
    updateSet: () => delay({}),
    deleteSet: () => delay(undefined),
  };
}
