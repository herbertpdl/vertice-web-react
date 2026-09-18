"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createWorkout, replaceWorkoutExercises, updateWorkout } from "@/lib/api/workouts";
import {
  addWorkoutExercise,
  deleteWorkoutExercise,
  updateWorkoutExercise,
} from "@/lib/api/workoutExercises";
import { createExerciseSet, deleteExerciseSet, updateExerciseSet } from "@/lib/api/exerciseSets";
import {
  createAutosaveEngine,
  type AutosaveEngine,
  type AutosaveState,
  type AutosaveTransport,
} from "./autosave";
import type { EditorWorkout } from "./model";

/** The real BFF-backed transport; everything goes through src/lib/api. */
export const bffTransport: AutosaveTransport = {
  create: createWorkout,
  replace: replaceWorkoutExercises,
  patchWorkout: updateWorkout,
  addExercise: addWorkoutExercise,
  updateExercise: updateWorkoutExercise,
  deleteExercise: deleteWorkoutExercise,
  addSet: createExerciseSet,
  updateSet: updateExerciseSet,
  deleteSet: deleteExerciseSet,
};

interface Options {
  planId: number;
  workoutId: number | null;
  initial: EditorWorkout;
  transport?: AutosaveTransport;
  delayMs?: number;
  onSaved?: (info: { workoutId: number; created: boolean }) => void;
}

/**
 * One autosave engine per editor session. `initial` is read once, at mount;
 * later prop changes are ignored on purpose so a query refetch can never
 * overwrite an edit in progress. The engine is never torn down on unmount: a
 * save still pending when the trainer navigates away inside the app should
 * complete, and React's dev StrictMode mount/cleanup/mount cycle must not
 * kill it either.
 */
export function useWorkoutAutosave(options: Options): [AutosaveState, AutosaveEngine] {
  const [engine] = useState(() =>
    createAutosaveEngine({
      planId: options.planId,
      workoutId: options.workoutId,
      initial: options.initial,
      transport: options.transport ?? bffTransport,
      delayMs: options.delayMs,
      onSaved: options.onSaved,
    }),
  );
  // Keep the latest callback without recreating the engine.
  const { onSaved } = options;
  useEffect(() => {
    engine.setOnSaved(onSaved);
  }, [engine, onSaved]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);
  return [state, engine];
}
