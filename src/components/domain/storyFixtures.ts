import { ApiError } from "@/lib/api/client";
import type {
  Exercise,
  FullWorkout,
  MuscleGroup,
  PasswordSetup,
  ClientDetail,
  ClientSummary,
  RecentWorkoutSummary,
} from "@/lib/api/types";
import type { AutosaveTransport } from "@/lib/workoutEditor/autosave";
import type { EditorExercise, EditorSet } from "@/lib/workoutEditor/model";

/** What `GET /muscle-groups` answers at launch: the 14 groups, in id order. */
export const muscleGroups: MuscleGroup[] = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posteriores de coxa",
  "Glúteos",
  "Panturrilhas",
  "Abdômen",
  "Lombar",
  "Trapézio",
  "Cardio",
].map((name, i) => ({ id: i + 1, name }));

const groups = (...names: string[]) =>
  names.map((name) => muscleGroups.find((g) => g.name === name)!);

const DESCRIPTION = "Movimento composto para desenvolvimento de força e volume.";

// Starter rows: primary group first.
export const supino: Exercise = {
  id: 1,
  name: "Supino Reto com Barra",
  description: DESCRIPTION,
  videoUrl: "https://www.youtube.com/watch?v=SupinoReto1",
  muscleGroups: groups("Peito", "Tríceps"),
  isStarter: true,
};
export const puxada: Exercise = {
  id: 2,
  name: "Puxada Alta na Polia",
  description: DESCRIPTION,
  videoUrl: "",
  muscleGroups: groups("Costas", "Bíceps"),
  isStarter: true,
};
export const agachamento: Exercise = {
  id: 3,
  name: "Agachamento Livre",
  description: DESCRIPTION,
  videoUrl: "https://youtu.be/Agachament1",
  muscleGroups: groups("Quadríceps", "Glúteos", "Posteriores de coxa"),
  isStarter: true,
};

/** The trainer's own exercise (`isStarter: false`): no primary group, so its groups come in id order. */
export const remadaPropria: Exercise = {
  id: 7,
  name: "Remada Unilateral no Banco",
  description: "Minha variação com pausa de 2 s no topo.",
  videoUrl: "",
  muscleGroups: groups("Costas", "Bíceps"),
  isStarter: false,
};

export const catalog: Exercise[] = [
  supino,
  puxada,
  agachamento,
  { id: 4, name: "Supino Inclinado com Halteres", description: DESCRIPTION, videoUrl: "https://youtu.be/SupinoIncl1", muscleGroups: groups("Peito", "Ombros"), isStarter: true },
  { id: 5, name: "Crucifixo na Polia", description: DESCRIPTION, videoUrl: "", muscleGroups: groups("Peito"), isStarter: true },
  { id: 6, name: "Desenvolvimento Militar", description: DESCRIPTION, videoUrl: "https://youtu.be/Desenvolvi1", muscleGroups: groups("Ombros", "Tríceps"), isStarter: true },
  remadaPropria,
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

// Server-confirmed cards carry `order`/`setNumber` like `fromFullWorkout` does,
// so a per-item sync against them only sends what actually changed.
export const supinoCard: EditorExercise = exercise(supino, {
  id: 10,
  order: 1,
  restSecondsBetweenSets: 90,
  notes: "Manter escápulas retraídas durante todo o movimento.",
  sets: [
    set({ id: 101, setNumber: 1, strategy: "WARM_UP", reps: 12, weight: "20", loadPercentage: "40", restSeconds: 60 }),
    set({ id: 102, setNumber: 2, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    set({ id: 103, setNumber: 3, reps: 8, weight: "60", loadPercentage: "75", restSeconds: 90 }),
    set({ id: 104, setNumber: 4, strategy: "BACKOFF", reps: 10, weight: "50", loadPercentage: "60", restSeconds: 90 }),
  ],
});

export const puxadaCard: EditorExercise = exercise(puxada, {
  id: 11,
  order: 2,
  restSecondsBetweenSets: 75,
  sets: [
    set({ id: 111, setNumber: 1, reps: 10, weight: "45", loadPercentage: "70", restSeconds: 75 }),
    set({ id: 112, setNumber: 2, reps: 10, weight: "45", loadPercentage: "70", restSeconds: 75 }),
    set({ id: 113, setNumber: 3, strategy: "DROPSET", weight: "45", restSeconds: 60 }),
  ],
});

export const agachamentoCard: EditorExercise = exercise(agachamento, { id: 12, order: 3, restSecondsBetweenSets: 60 });

/** What `GET /workouts/42/full` answers — the tree "usar treino existente como base" seeds the editor with (R25). */
export const treinoAFull: FullWorkout = {
  id: 42,
  name: "Treino A — Peito e Costas",
  trainingPlanId: 7,
  dayOfWeek: "MONDAY",
  exercises: [supinoCard, puxadaCard, agachamentoCard].map((we, i) => ({
    id: we.id!,
    workoutId: 42,
    exerciseId: we.exercise.id,
    order: i + 1,
    restSecondsBetweenSets: we.restSecondsBetweenSets,
    notes: we.notes,
    exercise: we.exercise,
    // Every field is set on the wire: "unset" reaches the client as the proto3 zero value
    // (`0` / `""`), which is what `fromFullWorkout` normalises back to undefined.
    sets: we.sets.map((s, j) => ({
      id: s.id!,
      workoutExerciseId: we.id!,
      setNumber: j + 1,
      reps: s.reps ?? 0,
      durationSeconds: s.durationSeconds ?? 0,
      weight: s.weight ?? "",
      loadPercentage: s.loadPercentage ?? "",
      strategy: s.strategy,
      restSeconds: s.restSeconds ?? 0,
      notes: s.notes ?? "",
    })),
  })),
};

export const recentWorkouts: RecentWorkoutSummary[] = [
  { id: 42, name: "Treino A — Peito e Costas", trainingPlanId: 7, dayOfWeek: "MONDAY", studentName: "Maria Silva", planName: "Hipertrofia — Fase 1", exerciseCount: 3 },
  { id: 41, name: "Treino B — Pernas", trainingPlanId: 7, dayOfWeek: "WEDNESDAY", studentName: "Maria Silva", planName: "Hipertrofia — Fase 1", exerciseCount: 5 },
  { id: 33, name: "Full body", trainingPlanId: 5, dayOfWeek: "FRIDAY", studentName: "João Souza", planName: "Condicionamento", exerciseCount: 6 },
];

export interface FakeTransportOptions {
  /**
   * Answer every whole-list replace with the 409 the platform sends once a
   * client has recorded data under the workout (E14): the editor must fall
   * back to the per-item endpoints.
   */
  refuseReplace?: boolean;
  /** Set ids whose removal the platform refuses with 409 — a client recorded performance on them (R27, E13). */
  protectedSetIds?: number[];
}

export interface FakeTransport extends AutosaveTransport {
  /** Every method called so far, in order — so a story can assert which endpoints a save went through. */
  calls: (keyof AutosaveTransport)[];
}

function preconditionFailed(message: string) {
  return new ApiError({ code: "PRECONDITION_FAILED", message }, 409);
}

/** A transport that answers like the BFF would, without HTTP (ids by position; everything succeeds unless `options` say otherwise). */
export function fakeTransport(options: FakeTransportOptions = {}): FakeTransport {
  const { refuseReplace = false, protectedSetIds = [] } = options;
  let nextId = 1000;
  const calls: FakeTransport["calls"] = [];
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
  const refuse = (message: string) =>
    new Promise<never>((_, reject) => setTimeout(() => reject(preconditionFailed(message)), 400));
  return {
    calls,
    create(planId, input) {
      calls.push("create");
      return delay(toFull(42, input.name, input.dayOfWeek, input.exercises ?? []));
    },
    getFull(workoutId) {
      calls.push("getFull");
      return delay(toFull(workoutId, "Treino", "MONDAY", []));
    },
    replace(workoutId, exercises) {
      calls.push("replace");
      if (refuseReplace) return refuse("Cannot replace exercises: a set under this workout has recorded workout data");
      return delay(toFull(workoutId, "Treino", "MONDAY", exercises));
    },
    patchWorkout() {
      calls.push("patchWorkout");
      return delay({});
    },
    addExercise(workoutId, input) {
      calls.push("addExercise");
      return delay({ id: ++nextId, workoutId, exerciseId: input.exerciseId, order: input.order, restSecondsBetweenSets: input.restSecondsBetweenSets, notes: input.notes ?? "" });
    },
    updateExercise() {
      calls.push("updateExercise");
      return delay({});
    },
    deleteExercise() {
      calls.push("deleteExercise");
      return delay(undefined);
    },
    addSet(workoutExerciseId, input) {
      calls.push("addSet");
      return delay({ id: ++nextId, workoutExerciseId, setNumber: input.setNumber, strategy: input.strategy });
    },
    updateSet() {
      calls.push("updateSet");
      return delay({});
    },
    deleteSet(id) {
      calls.push("deleteSet");
      if (protectedSetIds.includes(id)) return refuse(`Cannot delete set ${id}: it has recorded workout data`);
      return delay(undefined);
    },
  };
}

/** A first-access token as `POST /clients` returns it (shown once, expires in 72h). */
export const studentSetup: PasswordSetup = {
  token: "q2Zt8kV0b1xWmN4pR7sYcE3hJ6uA9dLfG5oTiK8wBzM",
  expiresAt: "2026-10-16T18:00:00Z",
};

/** A client as the BFF returns one: CPF masked (P1-03). */
export const newStudent: ClientDetail = {
  id: 42,
  name: "Marina Costa",
  email: "marina@email.com",
  cpf: "***.***.***-25",
  role: "CLIENT",
};

/** `newStudent`'s full CPF, as `GET /clients/42?reveal=cpf` returns it. */
export const newStudentFullCpf = "529.982.247-25";

/**
 * Roster rows (`GET /clients`). The BFF still sends a deprecated `email`; it is included here so
 * the stories prove the roster neither shows nor searches it.
 */
export const roster: (ClientSummary & { email: string })[] = [
  {
    id: 42,
    name: "Marina Costa",
    email: "marina@email.com",
    activePlanCount: 1,
    currentPlan: { id: 7, name: "Hipertrofia A", endDate: "2026-12-20" },
    lastWorkoutAt: null,
    weekActivity: [],
  },
  {
    id: 43,
    name: "Rafael Souza",
    email: "rafa.souza@email.com",
    activePlanCount: 0,
    currentPlan: null,
    lastWorkoutAt: null,
    weekActivity: [],
  },
];
