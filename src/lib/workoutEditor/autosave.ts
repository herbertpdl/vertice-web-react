import { ApiError } from "@/lib/api/client";
import type {
  ExerciseSet,
  FullWorkout,
  WorkoutExercise,
  WorkoutExerciseEntry,
} from "@/lib/api/types";
import type { WorkoutCreateInput, WorkoutInput } from "@/lib/api/workouts";
import type {
  WorkoutExerciseCreateInput,
  WorkoutExerciseUpdateInput,
} from "@/lib/api/workoutExercises";
import type { ExerciseSetInput } from "@/lib/api/exerciseSets";
import {
  DEFAULT_WORKOUT_NAME,
  fromFullWorkout,
  mergeIds,
  sameExerciseFields,
  sameSetFields,
  sameTree,
  toEntries,
  toSetEntry,
  adoptIds,
  type EditorExercise,
  type EditorSet,
  type EditorWorkout,
} from "./model";
import { reduce, type EditorAction } from "./reducer";

/** Everything the engine needs from the BFF, injectable so the engine is unit-testable without HTTP. */
export interface AutosaveTransport {
  create(planId: number, input: WorkoutCreateInput): Promise<FullWorkout>;
  replace(workoutId: number, exercises: WorkoutExerciseEntry[]): Promise<FullWorkout>;
  patchWorkout(workoutId: number, input: WorkoutInput): Promise<unknown>;
  addExercise(workoutId: number, input: WorkoutExerciseCreateInput): Promise<WorkoutExercise>;
  updateExercise(id: number, input: WorkoutExerciseUpdateInput): Promise<unknown>;
  deleteExercise(id: number): Promise<unknown>;
  addSet(workoutExerciseId: number, input: ExerciseSetInput): Promise<ExerciseSet>;
  updateSet(id: number, input: ExerciseSetInput): Promise<unknown>;
  deleteSet(id: number): Promise<unknown>;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type SyncMode = "replace" | "per-item";

/** A change the platform refused; shown in the banner and used to highlight what was undone. */
export interface Refusal {
  kind: "removal" | "generic";
  title: string;
  body: string;
  exerciseKeys: string[];
  setKeys: string[];
}

export interface AutosaveState {
  workoutId: number | null;
  /** True when the editor was opened on a workout that did not exist yet (drives the "usar como base" offer, R24). */
  openedAsNew: boolean;
  draft: EditorWorkout;
  status: SaveStatus;
  mode: SyncMode;
  refusal: Refusal | null;
  /** Message behind the footer's "Erro ao salvar" state, when one is known. */
  errorMessage: string | null;
}

export interface AutosaveOptions {
  planId: number;
  workoutId: number | null;
  initial: EditorWorkout;
  transport: AutosaveTransport;
  delayMs?: number;
  onSaved?: (info: { workoutId: number; created: boolean }) => void;
}

export interface AutosaveEngine {
  getState(): AutosaveState;
  subscribe(listener: () => void): () => void;
  dispatch(action: EditorAction): void;
  /** Sends the draft now (cancels the debounce). Resolves when this save and any chained one finished. */
  flush(): Promise<void>;
  /** "Tentar novamente": same as flush. */
  retry(): Promise<void>;
  /** "Concluir": flushes whatever is pending; resolves `true` when nothing failed. */
  finish(): Promise<boolean>;
  dismissRefusal(): void;
  /** Refuses a change with a footer error (e.g. an over-cap "usar como base" source, E8). */
  fail(message: string): void;
  /** Replaces the `onSaved` callback (React re-renders hand in a fresh closure). */
  setOnSaved(callback: AutosaveOptions["onSaved"]): void;
}

export const DEFAULT_DELAY_MS = 800;

function isNotFound(error: unknown) {
  return error instanceof ApiError && error.code === "NOT_FOUND";
}
function isPreconditionFailed(error: unknown) {
  return error instanceof ApiError && error.code === "PRECONDITION_FAILED";
}
function isValidationError(error: unknown) {
  return error instanceof ApiError && error.code === "VALIDATION_ERROR";
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não foi possível salvar";
}

function headerDirty(draft: EditorWorkout, base: EditorWorkout) {
  const name = draft.name.trim();
  return (name !== "" && name !== base.name) || draft.dayOfWeek !== base.dayOfWeek;
}

function setInput(set: EditorSet, setNumber: number): ExerciseSetInput {
  return { setNumber, ...toSetEntry(set), strategy: set.strategy };
}

interface RestoredExercise {
  exercise: EditorExercise;
  index: number;
}
interface RestoredSet {
  exerciseKey: string;
  exerciseName: string;
  set: EditorSet;
  index: number;
}

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const next = list.slice();
  next.splice(Math.min(index, next.length), 0, item);
  return next;
}

/** Puts refused removals back into `draft` (skipping any that are already there). */
function reinsertRestored(
  draft: EditorWorkout,
  exercises: RestoredExercise[],
  sets: RestoredSet[],
): EditorWorkout {
  let result = draft;
  for (const { exercise, index } of exercises) {
    if (result.exercises.some((we) => we.key === exercise.key)) continue;
    result = { ...result, exercises: insertAt(result.exercises, exercise, index) };
  }
  for (const { exerciseKey, set, index } of sets) {
    const i = result.exercises.findIndex((we) => we.key === exerciseKey);
    if (i < 0 || result.exercises[i].sets.some((s) => s.key === set.key)) continue;
    const list = result.exercises.slice();
    list[i] = { ...list[i], sets: insertAt(list[i].sets, set, index) };
    result = { ...result, exercises: list };
  }
  return result;
}

function removalRefusal(exercises: RestoredExercise[], sets: RestoredSet[]): Refusal {
  const setNames = sets.map((r) => `${r.exerciseName} · Série ${r.index + 1}`);
  const exerciseNames = exercises.map((r) => r.exercise.exercise.name);
  const names = [...setNames, ...exerciseNames].join(", ");
  const onlySets = exercises.length === 0;
  const onlyExercises = sets.length === 0;
  const single = exercises.length + sets.length === 1;
  const subject = onlySets
    ? single
      ? "essa série não pode mais ser removida"
      : "essas séries não podem mais ser removidas"
    : onlyExercises
      ? single
        ? "esse exercício não pode mais ser removido"
        : "esses exercícios não podem mais ser removidos"
      : "esses itens não podem mais ser removidos";
  const back = onlySets
    ? single
      ? "a série voltou para a tela"
      : "as séries voltaram para a tela"
    : onlyExercises
      ? single
        ? "o exercício voltou para a tela"
        : "os exercícios voltaram para a tela"
      : "os itens voltaram para a tela";
  return {
    kind: "removal",
    title: "Remoção não aplicada",
    body: `Um aluno já registrou desempenho em ${names}, então ${subject}. A remoção foi desfeita e ${back}. O restante do treino continua sendo salvo automaticamente.`,
    exerciseKeys: [...exercises.map((r) => r.exercise.key), ...sets.map((r) => r.exerciseKey)],
    setKeys: sets.map((r) => r.set.key),
  };
}

export function createAutosaveEngine(options: AutosaveOptions): AutosaveEngine {
  const { planId, transport } = options;
  let onSaved = options.onSaved;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const initial = options.initial;

  let state: AutosaveState = {
    workoutId: options.workoutId,
    openedAsNew: options.workoutId === null,
    draft: initial,
    status: "idle",
    mode: "replace",
    refusal: null,
    errorMessage: null,
  };
  // Last server-confirmed state (null until a new workout is created).
  let snapshot: EditorWorkout | null = options.workoutId === null ? null : initial;
  let hasSaved = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // One run at a time; a flush requested during a run waits behind it, and a
  // second request while one is already waiting coalesces into it (R8).
  let queue: Promise<void> = Promise.resolve();
  let queuedFlush = false;
  let running = false;
  const listeners = new Set<() => void>();

  function setState(patch: Partial<AutosaveState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function baseline(): EditorWorkout {
    return snapshot ?? initial;
  }

  function isDirty(draft: EditorWorkout): boolean {
    const base = baseline();
    return headerDirty(draft, base) || !sameTree(draft.exercises, base.exercises);
  }

  function restStatus(): SaveStatus {
    return hasSaved ? "saved" : "idle";
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    clearTimer();
    if (!isDirty(state.draft)) {
      // Edited back to what the server has: nothing to send. A run in progress
      // settles the status itself when it ends.
      if (!running) setState({ status: restStatus() });
      return;
    }
    if (state.status !== "saving") setState({ status: "saving" });
    timer = setTimeout(() => {
      timer = null;
      void flush();
    }, delayMs);
  }

  function flush(): Promise<void> {
    clearTimer();
    if (queuedFlush) return queue;
    queuedFlush = true;
    queue = queue.then(async () => {
      queuedFlush = false;
      await run();
    });
    return queue;
  }

  async function run() {
    const sent = state.draft;
    if (!isDirty(sent)) {
      setState({ status: restStatus() });
      return;
    }
    running = true;
    setState({ status: "saving", errorMessage: null });
    try {
      if (state.workoutId === null) await runCreate(sent);
      else await runUpdate(sent, state.workoutId);
      if (!isDirty(state.draft)) setState({ status: restStatus() });
      else if (timer === null && !queuedFlush) {
        // Still dirty with nothing scheduled: the engine itself changed the
        // draft (a rejected tree reverted under a kept name/weekday, E9), so
        // no dispatch armed a timer. Re-arm, or "Salvando…" would stick.
        schedule();
      } else setState({ status: "saving" });
    } catch (error) {
      setState({ status: "error", errorMessage: errorMessage(error) });
    } finally {
      running = false;
    }
  }

  async function runCreate(sent: EditorWorkout) {
    let full: FullWorkout;
    try {
      full = await transport.create(planId, {
        name: sent.name.trim() || DEFAULT_WORKOUT_NAME,
        dayOfWeek: sent.dayOfWeek,
        exercises: toEntries(sent.exercises),
      });
    } catch (error) {
      // A rejected tree is undone and the header retried on its own (E9);
      // a rejected header-only payload has nothing to undo — surface it as
      // the error state instead of reverting and re-arming forever.
      if (isValidationError(error) && sent.exercises.length > 0) {
        revertTree(error);
        return;
      }
      throw error;
    }
    const confirmed = adoptIds(sent, fromFullWorkout(full));
    snapshot = { ...confirmed, name: full.name };
    hasSaved = true;
    const draft = mergeIds(state.draft, confirmed);
    setState({
      workoutId: full.id,
      draft: { ...draft, name: draft.name.trim() === "" ? full.name : draft.name },
    });
    onSaved?.({ workoutId: full.id, created: true });
  }

  async function runUpdate(sent: EditorWorkout, workoutId: number) {
    const base = snapshot!;
    if (headerDirty(sent, base)) {
      const input: WorkoutInput = {
        name: sent.name.trim() || base.name,
        dayOfWeek: sent.dayOfWeek,
      };
      await transport.patchWorkout(workoutId, input);
      snapshot = { ...snapshot!, ...input };
      hasSaved = true;
    }
    if (!sameTree(sent.exercises, base.exercises)) {
      if (state.mode === "replace") {
        try {
          const full = await transport.replace(workoutId, toEntries(sent.exercises));
          const confirmed = adoptIds(sent, fromFullWorkout(full));
          snapshot = { ...snapshot!, exercises: confirmed.exercises };
          hasSaved = true;
          setState({ draft: mergeIds(state.draft, confirmed) });
        } catch (error) {
          if (isPreconditionFailed(error)) {
            // A client recorded data under this workout: every whole-list
            // replace is refused from now on, so sync one item at a time.
            setState({ mode: "per-item" });
            await runPerItem(sent, workoutId);
          } else if (isValidationError(error)) {
            revertTree(error);
            return;
          } else {
            throw error;
          }
        }
      } else {
        await runPerItem(sent, workoutId);
      }
    }
    onSaved?.({ workoutId, created: false });
  }

  /** E9: the whole rejected batch is undone (upstream changed nothing) and the platform's message shown. */
  function revertTree(error: unknown) {
    const base = baseline();
    const draft = { ...state.draft, exercises: base.exercises };
    setState({
      draft,
      refusal: {
        kind: "generic",
        title: "Alteração não aplicada",
        body: `${errorMessage(error)} A alteração foi desfeita; o restante do treino continua sendo salvo automaticamente.`,
        exerciseKeys: [],
        setKeys: [],
      },
    });
  }

  /**
   * Diff-syncs `sent` against the snapshot through the one-at-a-time endpoints.
   * Deletes first (a refused delete = the change a client's recorded data
   * protects: it is restored and named), then creates/updates in list order.
   * The snapshot is advanced op by op so a failure mid-way does not repeat
   * work on retry.
   */
  async function runPerItem(sent: EditorWorkout, workoutId: number) {
    const base = snapshot!;
    const restoredExercises: RestoredExercise[] = [];
    const restoredSets: RestoredSet[] = [];
    const sentByKey = new Map(sent.exercises.map((we) => [we.key, we]));
    // Server-side tree as we know it, mutated as each op succeeds.
    let working: EditorExercise[] = base.exercises.map((we) => ({ ...we, sets: we.sets.slice() }));
    const commit = () => {
      snapshot = { ...snapshot!, exercises: working };
    };

    try {
      // 1. Deletes.
      for (const [i, we] of base.exercises.entries()) {
        const sentWe = sentByKey.get(we.key);
        if (!sentWe) {
          if (we.id === null) continue;
          try {
            await transport.deleteExercise(we.id);
            working = working.filter((w) => w.key !== we.key);
          } catch (error) {
            if (isNotFound(error)) {
              working = working.filter((w) => w.key !== we.key);
            } else if (error instanceof ApiError) {
              restoredExercises.push({ exercise: we, index: i });
            } else {
              throw error;
            }
          }
          continue;
        }
        const sentSetKeys = new Set(sentWe.sets.map((set) => set.key));
        for (const [j, set] of we.sets.entries()) {
          if (sentSetKeys.has(set.key) || set.id === null) continue;
          try {
            await transport.deleteSet(set.id);
            working = working.map((w) =>
              w.key === we.key ? { ...w, sets: w.sets.filter((s) => s.key !== set.key) } : w,
            );
          } catch (error) {
            if (isNotFound(error)) {
              working = working.map((w) =>
                w.key === we.key ? { ...w, sets: w.sets.filter((s) => s.key !== set.key) } : w,
              );
            } else if (error instanceof ApiError) {
              restoredSets.push({ exerciseKey: we.key, exerciseName: we.exercise.name, set, index: j });
            } else {
              throw error;
            }
          }
        }
      }

      // 2. The list the server must end up with: `sent` plus whatever could not be removed.
      const effective = reinsertRestored(sent, restoredExercises, restoredSets);
      const workingByKey = new Map(working.map((we) => [we.key, we]));
      const confirmed: EditorExercise[] = [];
      const remaining = new Map(workingByKey);
      const snapshotPartial = (partial?: EditorExercise) => {
        working = [...confirmed, ...(partial ? [partial] : []), ...remaining.values()];
      };

      for (const [i, we] of effective.exercises.entries()) {
        const order = i + 1;
        const known = workingByKey.get(we.key);
        remaining.delete(we.key);
        const confirmedSets: EditorSet[] = [];
        if (!known || known.id === null) {
          const created = await transport.addExercise(workoutId, {
            exerciseId: we.exercise.id,
            order,
            restSecondsBetweenSets: we.restSecondsBetweenSets,
            notes: we.notes,
          });
          const withId: EditorExercise = { ...we, id: created.id, order, sets: [] };
          try {
            for (const [j, set] of we.sets.entries()) {
              const createdSet = await transport.addSet(created.id, setInput(set, j + 1));
              confirmedSets.push({ ...set, id: createdSet.id, setNumber: j + 1 });
            }
          } finally {
            snapshotPartial({ ...withId, sets: confirmedSets });
          }
          confirmed.push({ ...withId, sets: confirmedSets });
          continue;
        }
        if (!sameExerciseFields(we, known) || known.order !== order) {
          await transport.updateExercise(known.id, {
            order,
            restSecondsBetweenSets: we.restSecondsBetweenSets,
            notes: we.notes,
          });
        }
        const knownSetsByKey = new Map(known.sets.map((set) => [set.key, set]));
        const pendingSets = new Map(knownSetsByKey);
        try {
          for (const [j, set] of we.sets.entries()) {
            const knownSet = knownSetsByKey.get(set.key);
            pendingSets.delete(set.key);
            if (!knownSet || knownSet.id === null) {
              const createdSet = await transport.addSet(known.id, setInput(set, j + 1));
              confirmedSets.push({ ...set, id: createdSet.id, setNumber: j + 1 });
            } else {
              if (!sameSetFields(set, knownSet) || knownSet.setNumber !== j + 1) {
                await transport.updateSet(knownSet.id, setInput(set, j + 1));
              }
              confirmedSets.push({ ...set, id: knownSet.id, setNumber: j + 1 });
            }
          }
        } finally {
          snapshotPartial({
            ...we,
            id: known.id,
            order,
            sets: [...confirmedSets, ...pendingSets.values()],
          });
        }
        confirmed.push({ ...we, id: known.id, order, sets: confirmedSets });
      }
      working = [...confirmed, ...remaining.values()];
    } finally {
      commit();
    }

    hasSaved = true;
    let draft = mergeIds(state.draft, snapshot!);
    if (restoredExercises.length > 0 || restoredSets.length > 0) {
      draft = reinsertRestored(draft, restoredExercises, restoredSets);
      setState({ draft, refusal: removalRefusal(restoredExercises, restoredSets) });
    } else {
      setState({ draft });
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const next = reduce(state.draft, action);
      if (next === state.draft) return;
      setState({ draft: next });
      schedule();
    },
    flush,
    retry: flush,
    async finish() {
      // Drain: a flush chained behind this one *and* a debounce armed by an
      // edit made while it ran are both "the pending save" Concluir must
      // complete before leaving (R11, E17).
      do {
        await flush();
      } while (queuedFlush || timer !== null);
      return state.status !== "error";
    },
    dismissRefusal() {
      if (state.refusal) setState({ refusal: null });
    },
    fail(message) {
      setState({ status: "error", errorMessage: message });
    },
    setOnSaved(callback) {
      onSaved = callback;
    },
  };
}
