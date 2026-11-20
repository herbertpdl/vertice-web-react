import {
  DEFAULT_REST_BETWEEN_SETS,
  newKey,
  type EditorExercise,
  type EditorSet,
} from "@/lib/workoutEditor/model";
import type { ProposalExercise } from "./contract";

/**
 * A proposal's entries as editor exercises (spec "Review mode", assessment F5). An entry that
 * echoes the key of an exercise on screen keeps that exercise's key and id, and its sets keep the
 * on-screen sets' keys and ids by position, so the per-item sync and the change markers see an
 * edit, not a removal plus an addition. An entry with no key, an unknown key or a key already
 * used by an earlier entry is a new exercise with a fresh key, which the next chained request
 * then sends (E15).
 */
export function proposalToExercises(
  entries: ProposalExercise[],
  onScreen: EditorExercise[],
): EditorExercise[] {
  const byKey = new Map(onScreen.map((we) => [we.key, we]));
  const used = new Set<string>();
  return entries.map((entry) => {
    const candidate = entry.key && !used.has(entry.key) ? byKey.get(entry.key) : undefined;
    // Another catalog exercise under the same key is a swap: the per-item sync can't change a
    // workout exercise's `exerciseId`, so it is a removal plus a new exercise.
    const match = candidate && candidate.exercise.id === entry.exercise.id ? candidate : undefined;
    if (match) used.add(match.key);
    const sets: EditorSet[] = entry.sets.map((set, j) => {
      const previous = match?.sets[j];
      return {
        key: previous?.key ?? newKey("s"),
        id: previous?.id ?? null,
        setNumber: previous?.setNumber,
        reps: set.reps || undefined,
        durationSeconds: set.durationSeconds || undefined,
        weight: set.weight || undefined,
        loadPercentage: set.loadPercentage || undefined,
        strategy: set.strategy ?? "STRAIGHT",
        restSeconds: set.restSeconds || undefined,
        notes: set.notes || undefined,
      };
    });
    return {
      key: match?.key ?? newKey("e"),
      id: match?.id ?? null,
      order: match?.order,
      exercise: entry.exercise,
      // Optional on the wire: an omitted field keeps the on-screen value (or the editor's default).
      restSecondsBetweenSets:
        entry.restSecondsBetweenSets ?? match?.restSecondsBetweenSets ?? DEFAULT_REST_BETWEEN_SETS,
      notes: entry.notes ?? match?.notes ?? "",
      sets,
    };
  });
}
