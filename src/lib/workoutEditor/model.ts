import type {
  DayOfWeek,
  Exercise,
  ExerciseSetEntry,
  FullWorkout,
  SetStrategy,
  WorkoutExerciseEntry,
} from "@/lib/api/types";

export const MAX_EXERCISES = 20;
export const MAX_SETS = 10;
export const DEFAULT_WORKOUT_NAME = "Novo treino";
export const DEFAULT_REST_BETWEEN_SETS = 60;

/** One set in the editor. `id` is null until the server has confirmed it. */
export interface EditorSet {
  key: string;
  id: number | null;
  /** Server-side position, known only on confirmed items; used by the per-item sync diff. */
  setNumber?: number;
  reps?: number;
  durationSeconds?: number;
  weight?: string;
  loadPercentage?: string;
  strategy: SetStrategy;
  restSeconds?: number;
  notes?: string;
}

/** One exercise in the editor, with its catalog entry for display. */
export interface EditorExercise {
  key: string;
  id: number | null;
  /** Server-side position, known only on confirmed items; used by the per-item sync diff. */
  order?: number;
  exercise: Exercise;
  restSecondsBetweenSets: number;
  notes: string;
  sets: EditorSet[];
}

export interface EditorWorkout {
  name: string;
  dayOfWeek: DayOfWeek;
  exercises: EditorExercise[];
}

export type SetFields = Omit<EditorSet, "key" | "id" | "setNumber">;
export type ExerciseFields = Pick<EditorExercise, "restSecondsBetweenSets" | "notes">;

let keyCounter = 0;
export function newKey(prefix = "k"): string {
  keyCounter += 1;
  return `${prefix}${keyCounter}`;
}

export function newSet(): EditorSet {
  return { key: newKey("s"), id: null, strategy: "STRAIGHT" };
}

export function newExercise(exercise: Exercise): EditorExercise {
  return {
    key: newKey("e"),
    id: null,
    exercise,
    restSecondsBetweenSets: DEFAULT_REST_BETWEEN_SETS,
    notes: "",
    sets: [],
  };
}

export function emptyWorkout(dayOfWeek: DayOfWeek): EditorWorkout {
  return { name: "", dayOfWeek, exercises: [] };
}

function undefinedIfBlank(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

function undefinedIfZero(value: number | undefined): number | undefined {
  return value === undefined || value === 0 ? undefined : value;
}

/** Builds editor state from the BFF's full workout tree, keeping every server id. Fresh keys unless `keepIds` is false (seeding "usar como base"). */
export function fromFullWorkout(full: FullWorkout, { keepIds = true } = {}): EditorWorkout {
  return {
    name: full.name,
    dayOfWeek: full.dayOfWeek,
    exercises: full.exercises.map((we) => ({
      key: newKey("e"),
      id: keepIds ? we.id : null,
      order: keepIds ? we.order : undefined,
      exercise: we.exercise,
      restSecondsBetweenSets: we.restSecondsBetweenSets,
      notes: we.notes ?? "",
      sets: we.sets.map((set) => ({
        key: newKey("s"),
        id: keepIds ? set.id : null,
        setNumber: keepIds ? set.setNumber : undefined,
        // proto3 zero-values come back as 0/"" — normalise to "unset" so the
        // draft compares equal to what the trainer sees.
        reps: undefinedIfZero(set.reps),
        durationSeconds: undefinedIfZero(set.durationSeconds),
        weight: undefinedIfBlank(set.weight),
        loadPercentage: undefinedIfBlank(set.loadPercentage),
        strategy: set.strategy,
        restSeconds: undefinedIfZero(set.restSeconds),
        notes: undefinedIfBlank(set.notes),
      })),
    })),
  };
}

export function toSetEntry(set: EditorSet): ExerciseSetEntry {
  return {
    reps: set.reps,
    durationSeconds: set.durationSeconds,
    weight: set.weight,
    loadPercentage: set.loadPercentage,
    strategy: set.strategy,
    restSeconds: set.restSeconds,
    notes: set.notes,
  };
}

/** The nested payload for create/replace. No `order`/`setNumber`: list position is the order. */
export function toEntries(exercises: EditorExercise[]): WorkoutExerciseEntry[] {
  return exercises.map((we) => ({
    exerciseId: we.exercise.id,
    restSecondsBetweenSets: we.restSecondsBetweenSets,
    notes: we.notes,
    sets: we.sets.map(toSetEntry),
  }));
}

export function sameSetFields(a: EditorSet, b: EditorSet): boolean {
  return (
    a.reps === b.reps &&
    a.durationSeconds === b.durationSeconds &&
    a.weight === b.weight &&
    a.loadPercentage === b.loadPercentage &&
    a.strategy === b.strategy &&
    a.restSeconds === b.restSeconds &&
    a.notes === b.notes
  );
}

export function sameExerciseFields(a: EditorExercise, b: EditorExercise): boolean {
  return (
    a.exercise.id === b.exercise.id &&
    a.restSecondsBetweenSets === b.restSecondsBetweenSets &&
    a.notes === b.notes
  );
}

/** Structural equality of the exercise/set tree, by position (ids and keys ignored). */
export function sameTree(a: EditorExercise[], b: EditorExercise[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((we, i) => {
    const other = b[i];
    if (!sameExerciseFields(we, other) || we.sets.length !== other.sets.length) return false;
    return we.sets.every((set, j) => sameSetFields(set, other.sets[j]));
  });
}

/** Copies server ids from `confirmed` (same positions as what was sent, keyed) into `draft`, matching by key. */
export function mergeIds(draft: EditorWorkout, confirmed: EditorWorkout): EditorWorkout {
  const byKey = new Map(confirmed.exercises.map((we) => [we.key, we]));
  return {
    ...draft,
    exercises: draft.exercises.map((we) => {
      const match = byKey.get(we.key);
      if (!match) return we;
      const setsByKey = new Map(match.sets.map((set) => [set.key, set]));
      return {
        ...we,
        id: match.id,
        sets: we.sets.map((set) => {
          const setMatch = setsByKey.get(set.key);
          return setMatch ? { ...set, id: setMatch.id } : set;
        }),
      };
    }),
  };
}

/**
 * The confirmed state after a create/replace: the tree *as sent* (keys and
 * field values), with the ids/positions the server assigned by list position.
 * The server's echo is not used for field values because it normalises them
 * (e.g. decimal "60.5" comes back as "60.50"), which would leave the draft
 * looking dirty forever.
 */
export function adoptIds(sent: EditorWorkout, server: EditorWorkout): EditorWorkout {
  return {
    ...sent,
    exercises: sent.exercises.map((we, i) => {
      const confirmed = server.exercises[i];
      return {
        ...we,
        id: confirmed?.id ?? we.id,
        order: confirmed?.order ?? i + 1,
        sets: we.sets.map((set, j) => ({
          ...set,
          id: confirmed?.sets[j]?.id ?? set.id,
          setNumber: confirmed?.sets[j]?.setNumber ?? j + 1,
        })),
      };
    }),
  };
}

export function exceedsCaps(exercises: EditorExercise[]): string | null {
  if (exercises.length > MAX_EXERCISES) {
    return `O treino escolhido tem ${exercises.length} exercícios; o máximo é ${MAX_EXERCISES}.`;
  }
  const over = exercises.find((we) => we.sets.length > MAX_SETS);
  if (over) {
    return `${over.exercise.name} tem ${over.sets.length} séries; o máximo é ${MAX_SETS} por exercício.`;
  }
  return null;
}
