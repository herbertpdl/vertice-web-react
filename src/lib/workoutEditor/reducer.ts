import type { DayOfWeek, Exercise } from "@/lib/api/types";
import {
  MAX_EXERCISES,
  MAX_SETS,
  newExercise,
  newKey,
  newSet,
  type EditorExercise,
  type EditorSet,
  type EditorWorkout,
  type ExerciseFields,
  type SetFields,
} from "./model";

export type EditorAction =
  | { type: "setName"; name: string }
  | { type: "setDayOfWeek"; dayOfWeek: DayOfWeek }
  | { type: "addExercise"; exercise: Exercise }
  | { type: "removeExercise"; exerciseKey: string }
  | { type: "moveExercise"; exerciseKey: string; toIndex: number }
  | { type: "updateExercise"; exerciseKey: string; patch: Partial<ExerciseFields> }
  | { type: "addSet"; exerciseKey: string }
  | { type: "duplicateSet"; exerciseKey: string; setKey: string }
  | { type: "removeSet"; exerciseKey: string; setKey: string }
  | { type: "moveSet"; exerciseKey: string; setKey: string; toIndex: number }
  | { type: "updateSet"; exerciseKey: string; setKey: string; patch: Partial<SetFields> }
  /** "Usar treino existente como base": replaces name, weekday and the whole tree. */
  | { type: "seed"; workout: EditorWorkout };

function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  // `to` is an insertion index in the original list; account for the removal.
  const target = Math.max(0, Math.min(list.length - 1, to > from ? to - 1 : to));
  if (target === from) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(target, 0, item);
  return next;
}

function updateExerciseIn(
  draft: EditorWorkout,
  exerciseKey: string,
  fn: (we: EditorExercise) => EditorExercise,
): EditorWorkout {
  const index = draft.exercises.findIndex((we) => we.key === exerciseKey);
  if (index < 0) return draft;
  const updated = fn(draft.exercises[index]);
  if (updated === draft.exercises[index]) return draft;
  const exercises = draft.exercises.slice();
  exercises[index] = updated;
  return { ...draft, exercises };
}

export function reduce(draft: EditorWorkout, action: EditorAction): EditorWorkout {
  switch (action.type) {
    case "setName":
      return draft.name === action.name ? draft : { ...draft, name: action.name };
    case "setDayOfWeek":
      return draft.dayOfWeek === action.dayOfWeek ? draft : { ...draft, dayOfWeek: action.dayOfWeek };
    case "addExercise":
      if (draft.exercises.length >= MAX_EXERCISES) return draft;
      return { ...draft, exercises: [...draft.exercises, newExercise(action.exercise)] };
    case "removeExercise": {
      const exercises = draft.exercises.filter((we) => we.key !== action.exerciseKey);
      return exercises.length === draft.exercises.length ? draft : { ...draft, exercises };
    }
    case "moveExercise": {
      const from = draft.exercises.findIndex((we) => we.key === action.exerciseKey);
      const exercises = move(draft.exercises, from, action.toIndex);
      return exercises === draft.exercises ? draft : { ...draft, exercises };
    }
    case "updateExercise":
      return updateExerciseIn(draft, action.exerciseKey, (we) => ({ ...we, ...action.patch }));
    case "addSet":
      return updateExerciseIn(draft, action.exerciseKey, (we) =>
        we.sets.length >= MAX_SETS ? we : { ...we, sets: [...we.sets, newSet()] },
      );
    case "duplicateSet":
      return updateExerciseIn(draft, action.exerciseKey, (we) => {
        if (we.sets.length >= MAX_SETS) return we;
        const index = we.sets.findIndex((set) => set.key === action.setKey);
        if (index < 0) return we;
        const copy: EditorSet = { ...we.sets[index], key: newKey("s"), id: null, setNumber: undefined };
        const sets = we.sets.slice();
        sets.splice(index + 1, 0, copy);
        return { ...we, sets };
      });
    case "removeSet":
      return updateExerciseIn(draft, action.exerciseKey, (we) => {
        const sets = we.sets.filter((set) => set.key !== action.setKey);
        return sets.length === we.sets.length ? we : { ...we, sets };
      });
    case "moveSet":
      return updateExerciseIn(draft, action.exerciseKey, (we) => {
        const from = we.sets.findIndex((set) => set.key === action.setKey);
        const sets = move(we.sets, from, action.toIndex);
        return sets === we.sets ? we : { ...we, sets };
      });
    case "updateSet":
      return updateExerciseIn(draft, action.exerciseKey, (we) => {
        const index = we.sets.findIndex((set) => set.key === action.setKey);
        if (index < 0) return we;
        const sets = we.sets.slice();
        sets[index] = { ...sets[index], ...action.patch };
        return { ...we, sets };
      });
    case "seed":
      return { ...action.workout };
  }
}
