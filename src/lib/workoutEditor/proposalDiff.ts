import type { EditorExercise, EditorSet } from "./model";

/** Which of an exercise's own fields differ from the saved one. */
export type ExerciseField = "rest" | "notes";
export type SetField = "strategy" | "reps" | "weight" | "loadPercentage" | "rest" | "notes";

export type Marker = "new" | "changed";

export interface SetDiff {
  marker: Marker;
  fields: SetField[];
}

export interface ExerciseDiff {
  marker: Marker;
  fields: ExerciseField[];
  /** Per set key; a set missing here is unchanged. */
  sets: Record<string, SetDiff>;
  /** Saved sets the proposal drops. */
  removedSets: number;
}

export interface ProposalDiff {
  /** Per exercise key; an exercise missing here is unchanged. */
  exercises: Record<string, ExerciseDiff>;
  /** Saved exercises not in the draft, with their saved position (0-based). */
  removed: { exercise: EditorExercise; index: number }[];
}

function setFields(a: EditorSet, b: EditorSet): SetField[] {
  const fields: SetField[] = [];
  if (a.strategy !== b.strategy) fields.push("strategy");
  if (a.reps !== b.reps || a.durationSeconds !== b.durationSeconds) fields.push("reps");
  if (a.weight !== b.weight) fields.push("weight");
  if (a.loadPercentage !== b.loadPercentage) fields.push("loadPercentage");
  if (a.restSeconds !== b.restSeconds) fields.push("rest");
  if (a.notes !== b.notes) fields.push("notes");
  return fields;
}

/**
 * The review markers (R33): `draft` against `base`, the last saved workout, matched by key (F5) —
 * never by position or exercise id, so reordering and two entries of one exercise stay exact.
 * The base is the same after chained proposals, so markers never compare against an earlier
 * proposal (E15). A saved exercise that only moved is not marked.
 */
export function proposalDiff(base: EditorExercise[], draft: EditorExercise[]): ProposalDiff {
  const baseByKey = new Map(base.map((we) => [we.key, we]));
  const draftKeys = new Set(draft.map((we) => we.key));
  const exercises: Record<string, ExerciseDiff> = {};

  for (const we of draft) {
    const saved = baseByKey.get(we.key);
    if (!saved || saved.exercise.id !== we.exercise.id) {
      exercises[we.key] = {
        marker: "new",
        fields: [],
        sets: Object.fromEntries(we.sets.map((s) => [s.key, { marker: "new" as const, fields: [] }])),
        removedSets: 0,
      };
      continue;
    }
    const fields: ExerciseField[] = [];
    if (we.restSecondsBetweenSets !== saved.restSecondsBetweenSets) fields.push("rest");
    if (we.notes !== saved.notes) fields.push("notes");
    const savedSets = new Map(saved.sets.map((s) => [s.key, s]));
    const sets: Record<string, SetDiff> = {};
    for (const set of we.sets) {
      const savedSet = savedSets.get(set.key);
      if (!savedSet) {
        sets[set.key] = { marker: "new", fields: [] };
        continue;
      }
      const changed = setFields(set, savedSet);
      if (changed.length > 0) sets[set.key] = { marker: "changed", fields: changed };
    }
    const keptKeys = new Set(we.sets.map((s) => s.key));
    const removedSets = saved.sets.filter((s) => !keptKeys.has(s.key)).length;
    if (fields.length > 0 || Object.keys(sets).length > 0 || removedSets > 0) {
      exercises[we.key] = { marker: "changed", fields, sets, removedSets };
    }
  }

  const removed = base.flatMap((exercise, index) => {
    const replaced = draft.find((we) => we.key === exercise.key);
    // Same key, another exercise: the saved one is gone (and the draft one is "new").
    if (draftKeys.has(exercise.key) && replaced?.exercise.id === exercise.exercise.id) return [];
    return [{ exercise, index }];
  });

  return { exercises, removed };
}
