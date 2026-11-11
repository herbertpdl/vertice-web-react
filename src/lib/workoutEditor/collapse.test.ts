import { describe, expect, it } from "vitest";
import type { EditorExercise } from "./model";
import { allCollapsed, expandRefused, setCountLabel, toggleAll, toggleCollapsed } from "./collapse";

function card(key: string, setKeys: string[] = []): EditorExercise {
  return {
    key,
    id: null,
    exercise: { id: 1, name: key, muscleGroups: [] } as unknown as EditorExercise["exercise"],
    restSecondsBetweenSets: 60,
    notes: "",
    sets: setKeys.map((k) => ({ key: k, id: null, strategy: "STRAIGHT" })),
  };
}

describe("setCountLabel", () => {
  it("says none, one, or N sets, with no cap hint (R3, E6, E7)", () => {
    expect(setCountLabel(0)).toBe("Nenhuma série");
    expect(setCountLabel(1)).toBe("1 série");
    expect(setCountLabel(4)).toBe("4 séries");
    expect(setCountLabel(10)).toBe("10 séries");
  });
});

describe("toggleCollapsed", () => {
  it("flips one card without touching the others", () => {
    const once = toggleCollapsed(new Set(["a"]), "b");
    expect([...once].sort()).toEqual(["a", "b"]);
    expect([...toggleCollapsed(once, "a")]).toEqual(["b"]);
  });
});

describe("allCollapsed / toggleAll", () => {
  const exercises = [card("a"), card("b"), card("c")];

  it("collapses every card while any is expanded (R13)", () => {
    expect(allCollapsed(exercises, new Set(["a"]))).toBe(false);
    expect([...toggleAll(exercises, new Set(["a"]))].sort()).toEqual(["a", "b", "c"]);
  });

  it("expands every card once all are collapsed (R14)", () => {
    const all = new Set(["a", "b", "c"]);
    expect(allCollapsed(exercises, all)).toBe(true);
    expect(toggleAll(exercises, all).size).toBe(0);
  });

  it("treats a newly added card as expanded (R9, E2)", () => {
    const collapsed = new Set(["a", "b", "c"]);
    expect(allCollapsed([...exercises, card("new")], collapsed)).toBe(false);
  });

  it("ignores keys of removed exercises", () => {
    expect(allCollapsed([card("a")], new Set(["a", "gone"]))).toBe(true);
  });

  it("is never all-collapsed with no exercises", () => {
    expect(allCollapsed([], new Set())).toBe(false);
  });
});

describe("expandRefused", () => {
  const exercises = [card("a", ["a1", "a2"]), card("b", ["b1"]), card("c")];

  it("expands a collapsed card whose removal came back (R11, E3)", () => {
    expect([...expandRefused(exercises, new Set(["a", "c"]), { exerciseKeys: ["c"], setKeys: [] })]).toEqual(["a"]);
  });

  it("expands the collapsed card owning a restored set (E4)", () => {
    expect([...expandRefused(exercises, new Set(["a", "b"]), { exerciseKeys: [], setKeys: ["a2"] })]).toEqual(["b"]);
  });

  it("returns the same set when no affected card is collapsed", () => {
    const collapsed = new Set(["b"]);
    expect(expandRefused(exercises, collapsed, { exerciseKeys: ["a"], setKeys: ["a1"] })).toBe(collapsed);
  });
});
