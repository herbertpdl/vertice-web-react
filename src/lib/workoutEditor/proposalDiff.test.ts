import { describe, expect, it } from "vitest";
import type { Exercise } from "@/lib/api/types";
import { proposalToExercises } from "@/lib/assistant/proposal";
import type { ProposalExercise } from "@/lib/assistant/contract";
import type { EditorExercise } from "./model";
import { proposalDiff } from "./proposalDiff";

const ex = (id: number, name: string): Exercise => ({
  id,
  name,
  description: "",
  videoUrl: "",
  muscleGroups: [],
  isStarter: true,
});
const supino = ex(1, "Supino");
const puxada = ex(2, "Puxada");
const agachamento = ex(3, "Agachamento");

const saved: EditorExercise[] = [
  {
    key: "xe1",
    id: 11,
    order: 1,
    exercise: supino,
    restSecondsBetweenSets: 60,
    notes: "",
    sets: [
      { key: "xs1", id: 101, setNumber: 1, reps: 10, strategy: "STRAIGHT" },
      { key: "xs2", id: 102, setNumber: 2, reps: 10, strategy: "STRAIGHT" },
    ],
  },
  {
    key: "xe2",
    id: 12,
    order: 2,
    exercise: puxada,
    restSecondsBetweenSets: 90,
    notes: "",
    sets: [{ key: "xs3", id: 103, setNumber: 1, reps: 8, strategy: "STRAIGHT" }],
  },
];

const entry = (p: Partial<ProposalExercise> & { exercise: Exercise }): ProposalExercise => ({
  restSecondsBetweenSets: 60,
  notes: "",
  sets: [],
  ...p,
});

describe("proposalToExercises", () => {
  it("keeps an echoed exercise's key and id, and its sets' by position", () => {
    const [first] = proposalToExercises(
      [entry({ key: "xe1", exercise: supino, sets: [{ reps: 8 }, { reps: 8 }, { reps: 8 }] })],
      saved,
    );
    expect(first.key).toBe("xe1");
    expect(first.id).toBe(11);
    expect(first.sets.map((s) => [s.key, s.id])).toEqual([
      ["xs1", 101],
      ["xs2", 102],
      [expect.stringMatching(/^s\d/), null],
    ]);
    expect(first.sets[2].key).not.toMatch(/^xs/);
  });

  it("gives a new key to a new, unknown, repeated or swapped entry", () => {
    const result = proposalToExercises(
      [
        entry({ exercise: agachamento }),
        entry({ key: "nope", exercise: supino }),
        entry({ key: "xe2", exercise: puxada }),
        entry({ key: "xe2", exercise: puxada }),
        entry({ key: "xe1", exercise: agachamento }),
      ],
      saved,
    );
    expect(result.map((we) => we.id)).toEqual([null, null, 12, null, null]);
    expect(new Set(result.map((we) => we.key)).size).toBe(5);
    expect(result[4].key).not.toBe("xe1");
  });
});

describe("proposalDiff (R33)", () => {
  it("marks new, changed and removed items against the saved workout, matched by key", () => {
    const draft = proposalToExercises(
      [
        // Puxada moved up, unchanged.
        entry({ key: "xe2", exercise: puxada, restSecondsBetweenSets: 90, sets: [{ reps: 8 }] }),
        entry({ exercise: agachamento, sets: [{ reps: 12 }] }),
      ],
      saved,
    );
    const diff = proposalDiff(saved, draft);
    expect(diff.exercises.xe2).toBeUndefined();
    expect(diff.exercises[draft[1].key]).toMatchObject({ marker: "new" });
    expect(diff.removed).toEqual([{ exercise: saved[0], index: 0 }]);
  });

  it("highlights changed fields and new sets, and counts removed sets", () => {
    const draft = proposalToExercises(
      [
        entry({
          key: "xe1",
          exercise: supino,
          restSecondsBetweenSets: 45,
          sets: [{ reps: 8, weight: "40" }],
        }),
        entry({
          key: "xe2",
          exercise: puxada,
          restSecondsBetweenSets: 90,
          sets: [{ reps: 8 }, { reps: 6, strategy: "DROPSET" }],
        }),
      ],
      saved,
    );
    const diff = proposalDiff(saved, draft);
    expect(diff.exercises.xe1).toEqual({
      marker: "changed",
      fields: ["rest"],
      sets: { xs1: { marker: "changed", fields: ["reps", "weight"] } },
      removedSets: 1,
    });
    expect(diff.exercises.xe2.sets[draft[1].sets[1].key]).toEqual({ marker: "new", fields: [] });
    expect(diff.removed).toEqual([]);
  });

  it("tells two entries of the same exercise apart (API-R7)", () => {
    const draft = proposalToExercises(
      [
        entry({ key: "xe1", exercise: supino, sets: [{ reps: 10 }, { reps: 10 }] }),
        entry({ exercise: supino, sets: [{ reps: 10 }] }),
        entry({ key: "xe2", exercise: puxada, restSecondsBetweenSets: 90, sets: [{ reps: 8 }] }),
      ],
      saved,
    );
    const diff = proposalDiff(saved, draft);
    expect(Object.keys(diff.exercises)).toEqual([draft[1].key]);
  });

  it("marks a swap under the same key as removed plus new", () => {
    const swapped: EditorExercise[] = [{ ...saved[0], exercise: agachamento }, saved[1]];
    const diff = proposalDiff(saved, swapped);
    expect(diff.exercises.xe1.marker).toBe("new");
    expect(diff.removed.map((r) => r.exercise.exercise.name)).toEqual(["Supino"]);
  });
});
