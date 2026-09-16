import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { Exercise, FullWorkout, FullWorkoutExercise } from "@/lib/api/types";
import { createAutosaveEngine, type AutosaveTransport } from "./autosave";
import { emptyWorkout, fromFullWorkout } from "./model";

const supino: Exercise = { id: 1, name: "Supino Reto", description: "", videoUrl: "", muscleGroup: "CHEST" };
const puxada: Exercise = { id: 2, name: "Puxada Alta", description: "", videoUrl: "", muscleGroup: "BACK" };

let nextId = 100;

/** Builds the FullWorkout the BFF would return for a nested create/replace payload: fresh ids, positions from list order. */
function fullFromEntries(
  id: number,
  name: string,
  entries: { exerciseId: number; restSecondsBetweenSets?: number; notes?: string; sets?: { strategy?: string; reps?: number; weight?: string }[] }[],
): FullWorkout {
  const catalog = { 1: supino, 2: puxada } as Record<number, Exercise>;
  return {
    id,
    name,
    trainingPlanId: 7,
    dayOfWeek: "MONDAY",
    exercises: entries.map((entry, i): FullWorkoutExercise => {
      const weId = ++nextId;
      return {
        id: weId,
        workoutId: id,
        exerciseId: entry.exerciseId,
        order: i + 1,
        restSecondsBetweenSets: entry.restSecondsBetweenSets ?? 0,
        notes: entry.notes ?? "",
        exercise: catalog[entry.exerciseId],
        sets: (entry.sets ?? []).map((set, j) => ({
          id: ++nextId,
          workoutExerciseId: weId,
          setNumber: j + 1,
          reps: set.reps ?? 0,
          durationSeconds: 0,
          weight: set.weight ?? "",
          loadPercentage: "",
          strategy: (set.strategy ?? "STRAIGHT") as FullWorkoutExercise["sets"][number]["strategy"],
          restSeconds: 0,
          notes: "",
        })),
      };
    }),
  };
}

function apiError(code: string, status: number, message = code) {
  return new ApiError({ code, message }, status);
}

function makeTransport(): AutosaveTransport & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    create: vi.fn(async (planId, input) => {
      calls.push("create");
      return fullFromEntries(42, input.name, input.exercises ?? []);
    }),
    replace: vi.fn(async (workoutId, exercises) => {
      calls.push("replace");
      return fullFromEntries(workoutId, "Treino A", exercises);
    }),
    patchWorkout: vi.fn(async () => {
      calls.push("patch");
      return {};
    }),
    addExercise: vi.fn(async (workoutId, input) => {
      calls.push("addExercise");
      return { id: ++nextId, workoutId, exerciseId: input.exerciseId, order: input.order, restSecondsBetweenSets: input.restSecondsBetweenSets, notes: input.notes ?? "" };
    }),
    updateExercise: vi.fn(async () => {
      calls.push("updateExercise");
      return {};
    }),
    deleteExercise: vi.fn(async () => {
      calls.push("deleteExercise");
    }),
    addSet: vi.fn(async (workoutExerciseId, input) => {
      calls.push("addSet");
      return { id: ++nextId, workoutExerciseId, setNumber: input.setNumber, strategy: input.strategy };
    }),
    updateSet: vi.fn(async () => {
      calls.push("updateSet");
      return {};
    }),
    deleteSet: vi.fn(async () => {
      calls.push("deleteSet");
    }),
  };
}

/** Lets queued microtasks (resolved transport promises) settle. */
async function settle() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("new workout", () => {
  it("never creates a workout that was not changed (R5)", async () => {
    const transport = makeTransport();
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), transport, delayMs: 100 });
    expect(await engine.finish()).toBe(true);
    expect(transport.create).not.toHaveBeenCalled();
    expect(engine.getState().status).toBe("idle");
  });

  it("debounces a burst of edits into one nested create, auto-naming it 'Novo treino' (R3, R4, E2, E15)", async () => {
    const transport = makeTransport();
    const onSaved = vi.fn();
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), transport, delayMs: 100, onSaved });

    engine.dispatch({ type: "addExercise", exercise: supino });
    const exerciseKey = engine.getState().draft.exercises[0].key;
    engine.dispatch({ type: "addSet", exerciseKey });
    const setKey = engine.getState().draft.exercises[0].sets[0].key;
    engine.dispatch({ type: "updateSet", exerciseKey, setKey, patch: { reps: 12 } });
    engine.dispatch({ type: "updateSet", exerciseKey, setKey, patch: { weight: "60" } });
    expect(engine.getState().status).toBe("saving");
    expect(transport.create).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(100);
    await settle();

    expect(transport.create).toHaveBeenCalledTimes(1);
    expect(transport.create).toHaveBeenCalledWith(7, {
      name: "Novo treino",
      dayOfWeek: "MONDAY",
      exercises: [{ exerciseId: 1, restSecondsBetweenSets: 60, notes: "", sets: [{ reps: 12, weight: "60", strategy: "STRAIGHT" }] }],
    });
    const state = engine.getState();
    expect(state.status).toBe("saved");
    expect(state.workoutId).toBe(42);
    expect(state.draft.name).toBe("Novo treino");
    expect(state.draft.exercises[0].id).not.toBeNull();
    expect(state.draft.exercises[0].sets[0].id).not.toBeNull();
    expect(onSaved).toHaveBeenCalledWith({ workoutId: 42, created: true });
  });

  it("uses the typed name and creates an empty workout (E1)", async () => {
    const transport = makeTransport();
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("TUESDAY"), transport, delayMs: 100 });
    engine.dispatch({ type: "setName", name: "Treino B" });
    expect(await engine.finish()).toBe(true);
    expect(transport.create).toHaveBeenCalledWith(7, { name: "Treino B", dayOfWeek: "TUESDAY", exercises: [] });
  });

  it("folds edits made during an in-flight save into exactly one follow-up save (R8)", async () => {
    const transport = makeTransport();
    let resolveCreate: (value: FullWorkout) => void = () => {};
    transport.create = vi.fn(
      () => new Promise<FullWorkout>((resolve) => { resolveCreate = resolve; }),
    );
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), transport, delayMs: 100 });

    engine.dispatch({ type: "addExercise", exercise: supino });
    await vi.advanceTimersByTimeAsync(100);
    expect(transport.create).toHaveBeenCalledTimes(1);

    // Two more edits while the create is in flight.
    engine.dispatch({ type: "addExercise", exercise: puxada });
    await vi.advanceTimersByTimeAsync(100);
    engine.dispatch({ type: "setName", name: "Treino A" });
    await vi.advanceTimersByTimeAsync(100);
    expect(transport.replace).not.toHaveBeenCalled();

    resolveCreate(fullFromEntries(42, "Novo treino", [{ exerciseId: 1, restSecondsBetweenSets: 60 }]));
    await settle();
    await vi.advanceTimersByTimeAsync(0);
    await settle();

    expect(transport.patchWorkout).toHaveBeenCalledTimes(1);
    expect(transport.replace).toHaveBeenCalledTimes(1);
    expect(transport.replace).toHaveBeenCalledWith(42, [
      { exerciseId: 1, restSecondsBetweenSets: 60, notes: "", sets: [] },
      { exerciseId: 2, restSecondsBetweenSets: 60, notes: "", sets: [] },
    ]);
    expect(engine.getState().status).toBe("saved");
    expect(engine.getState().draft.exercises.map((we) => we.id)).not.toContain(null);
  });

  it("reverts the rejected batch on a 400 and keeps the message (E9)", async () => {
    const transport = makeTransport();
    transport.create = vi.fn(async () => { throw apiError("VALIDATION_ERROR", 400, "exercise_id: one or more referenced exercises do not exist"); });
    const engine = createAutosaveEngine({ planId: 7, workoutId: null, initial: emptyWorkout("MONDAY"), transport, delayMs: 100 });
    engine.dispatch({ type: "addExercise", exercise: supino });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    const state = engine.getState();
    expect(state.draft.exercises).toHaveLength(0);
    expect(state.refusal?.kind).toBe("generic");
    expect(state.refusal?.body).toContain("one or more referenced exercises do not exist");
    expect(state.status).toBe("idle");
  });
});

describe("existing workout", () => {
  const existing = fullFromEntries(42, "Treino A", [
    { exerciseId: 1, restSecondsBetweenSets: 90, sets: [{ reps: 12 }, { reps: 8 }] },
    { exerciseId: 2, restSecondsBetweenSets: 60, sets: [{ reps: 10 }] },
  ]);

  function setup(overrides: Partial<AutosaveTransport> = {}) {
    const transport = Object.assign(makeTransport(), overrides);
    const engine = createAutosaveEngine({ planId: 7, workoutId: 42, initial: fromFullWorkout(existing), transport, delayMs: 100 });
    return { transport, engine };
  }

  it("patches name/weekday and replaces the tree in one flush (R7)", async () => {
    const { transport, engine } = setup();
    engine.dispatch({ type: "setName", name: "Treino A — Superior" });
    engine.dispatch({ type: "setDayOfWeek", dayOfWeek: "FRIDAY" });
    const [first] = engine.getState().draft.exercises;
    engine.dispatch({ type: "updateExercise", exerciseKey: first.key, patch: { notes: "Escápulas retraídas" } });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(transport.calls).toEqual(["patch", "replace"]);
    expect(transport.patchWorkout).toHaveBeenCalledWith(42, { name: "Treino A — Superior", dayOfWeek: "FRIDAY" });
    expect(engine.getState().status).toBe("saved");
  });

  it("reorders through the replace payload (R15, R17, E10)", async () => {
    const { transport, engine } = setup();
    const [, second] = engine.getState().draft.exercises;
    engine.dispatch({ type: "moveExercise", exerciseKey: second.key, toIndex: 0 });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(transport.replace).toHaveBeenCalledTimes(1);
    const sent = (transport.replace as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(sent.map((e: { exerciseId: number }) => e.exerciseId)).toEqual([2, 1]);
  });

  it("stays 'saved' when the server echoes normalised values (decimal 60.5 → 60.50)", async () => {
    const { transport, engine } = setup({
      replace: vi.fn(async (workoutId, exercises) => {
        const full = fullFromEntries(workoutId, "Treino A", exercises);
        full.exercises[0].sets[0].weight = "60.50";
        return full;
      }),
    });
    const [first] = engine.getState().draft.exercises;
    engine.dispatch({ type: "updateSet", exerciseKey: first.key, setKey: first.sets[0].key, patch: { weight: "60.5" } });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(transport.replace).toHaveBeenCalledTimes(1);
    expect(engine.getState().status).toBe("saved");
    expect(engine.getState().draft.exercises[0].sets[0].weight).toBe("60.5");
    // Nothing left to send.
    expect(await engine.finish()).toBe(true);
    expect(transport.replace).toHaveBeenCalledTimes(1);
  });

  it("does not send a blank name (BFF requires min 1)", async () => {
    const { transport, engine } = setup();
    engine.dispatch({ type: "setName", name: "" });
    expect(await engine.finish()).toBe(true);
    expect(transport.patchWorkout).not.toHaveBeenCalled();
  });

  it("switches to per-item mode on 409 and saves the non-removal change (E14)", async () => {
    const { transport, engine } = setup({
      replace: vi.fn(async () => { throw apiError("PRECONDITION_FAILED", 409, "Cannot replace exercises: exercise 'Supino Reto' (id 1) set 1 has recorded workout data"); }),
    });
    const [, second] = engine.getState().draft.exercises;
    engine.dispatch({ type: "updateExercise", exerciseKey: second.key, patch: { restSecondsBetweenSets: 75 } });
    engine.dispatch({ type: "addSet", exerciseKey: second.key });
    await vi.advanceTimersByTimeAsync(100);
    await settle();

    expect(transport.replace).toHaveBeenCalledTimes(1);
    expect(transport.calls).toEqual(["updateExercise", "addSet"]);
    expect(transport.updateExercise).toHaveBeenCalledWith(second.id, { order: 2, restSecondsBetweenSets: 75, notes: "" });
    expect(transport.addSet).toHaveBeenCalledWith(second.id, expect.objectContaining({ setNumber: 2, strategy: "STRAIGHT" }));
    const state = engine.getState();
    expect(state.mode).toBe("per-item");
    expect(state.refusal).toBeNull();
    expect(state.status).toBe("saved");
    expect(state.draft.exercises[1].sets[1].id).not.toBeNull();

    // Later edits go straight to the per-item endpoints.
    engine.dispatch({ type: "setName", name: "Treino A2" });
    engine.dispatch({ type: "addExercise", exercise: supino });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(transport.replace).toHaveBeenCalledTimes(1);
    expect(transport.addExercise).toHaveBeenCalledWith(42, { exerciseId: 1, order: 3, restSecondsBetweenSets: 60, notes: "" });
  });

  it("restores a removal a client's recorded data protects, names it, and keeps saving the rest (R27, E13)", async () => {
    const { transport, engine } = setup({
      replace: vi.fn(async () => { throw apiError("PRECONDITION_FAILED", 409); }),
      deleteSet: vi.fn(async () => { throw apiError("UPSTREAM_ERROR", 502); }),
    });
    const [first, second] = engine.getState().draft.exercises;
    const protectedSet = first.sets[1];
    engine.dispatch({ type: "removeSet", exerciseKey: first.key, setKey: protectedSet.key });
    engine.dispatch({ type: "updateExercise", exerciseKey: second.key, patch: { notes: "Pegada aberta" } });
    await vi.advanceTimersByTimeAsync(100);
    await settle();

    const state = engine.getState();
    expect(transport.deleteSet).toHaveBeenCalledWith(protectedSet.id);
    expect(transport.updateExercise).toHaveBeenCalledWith(second.id, expect.objectContaining({ notes: "Pegada aberta" }));
    expect(state.draft.exercises[0].sets.map((s) => s.key)).toEqual(first.sets.map((s) => s.key));
    expect(state.refusal).toMatchObject({
      kind: "removal",
      title: "Remoção não aplicada",
      setKeys: [protectedSet.key],
      exerciseKeys: [first.key],
    });
    expect(state.refusal?.body).toBe(
      "Um aluno já registrou desempenho em Supino Reto · Série 2, então essa série não pode mais ser removida. A remoção foi desfeita e a série voltou para a tela. O restante do treino continua sendo salvo automaticamente.",
    );
    expect(state.status).toBe("saved");

    engine.dismissRefusal();
    expect(engine.getState().refusal).toBeNull();
    // The restored set is in sync with the server again: nothing left to send.
    expect(await engine.finish()).toBe(true);
    expect(transport.deleteSet).toHaveBeenCalledTimes(1);
  });

  it("names a refused exercise removal (R27)", async () => {
    const { transport, engine } = setup({
      replace: vi.fn(async () => { throw apiError("PRECONDITION_FAILED", 409); }),
      deleteExercise: vi.fn(async () => { throw apiError("UPSTREAM_ERROR", 502); }),
    });
    const [first] = engine.getState().draft.exercises;
    engine.dispatch({ type: "removeExercise", exerciseKey: first.key });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    const state = engine.getState();
    expect(transport.deleteExercise).toHaveBeenCalledWith(first.id);
    expect(state.draft.exercises[0].key).toBe(first.key);
    expect(state.refusal?.body).toContain("em Supino Reto, então esse exercício não pode mais ser removido");
    // The other exercise kept its position: no spurious order patch.
    expect(transport.updateExercise).not.toHaveBeenCalled();
  });

  it("shows the error state on a network failure and retries with the current draft (R10, E16)", async () => {
    let fail = true;
    const { transport, engine } = setup({
      replace: vi.fn(async (workoutId, exercises) => {
        if (fail) throw new TypeError("Failed to fetch");
        return fullFromEntries(workoutId, "Treino A", exercises);
      }),
    });
    const [first] = engine.getState().draft.exercises;
    engine.dispatch({ type: "addSet", exerciseKey: first.key });
    await vi.advanceTimersByTimeAsync(100);
    await settle();
    expect(engine.getState().status).toBe("error");
    expect(engine.getState().errorMessage).toBe("Failed to fetch");
    expect(engine.getState().draft.exercises[0].sets).toHaveLength(3);

    // A further edit while in error just waits for the retry.
    engine.dispatch({ type: "updateExercise", exerciseKey: first.key, patch: { notes: "x" } });
    fail = false;
    await engine.retry();
    expect(engine.getState().status).toBe("saved");
    const sent = (transport.replace as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1];
    expect(sent[0].notes).toBe("x");
    expect(sent[0].sets).toHaveLength(3);
  });

  it("finish() completes the pending save first and reports failure (R11, E17)", async () => {
    const { transport, engine } = setup({
      replace: vi.fn(async () => { throw new TypeError("Failed to fetch"); }),
    });
    const [first] = engine.getState().draft.exercises;
    engine.dispatch({ type: "removeExercise", exerciseKey: first.key });
    expect(await engine.finish()).toBe(false);
    expect(transport.replace).toHaveBeenCalledTimes(1);
    expect(engine.getState().status).toBe("error");
  });

  it("finish() with nothing pending resolves immediately", async () => {
    const { transport, engine } = setup();
    expect(await engine.finish()).toBe(true);
    expect(transport.calls).toEqual([]);
  });
});
