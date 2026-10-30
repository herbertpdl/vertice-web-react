import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exerciseSearch, fetchAllExercises, fetchExercisesPage } from "./exercises";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const row = (id: number) => ({ id, name: `E${id}`, description: "", videoUrl: "", muscleGroups: [], isStarter: true });
const sentUrl = (call: number) => new URL(String(fetchMock.mock.calls[call]![0]), "http://localhost");

describe("exerciseSearch", () => {
  it("stays idle with no text and no group", () => {
    expect(exerciseSearch("", null)).toEqual({ muscleGroupId: null, q: "", enabled: false });
  });

  it("stays idle below 3 letters, ignoring surrounding spaces", () => {
    expect(exerciseSearch("su", null).enabled).toBe(false);
    expect(exerciseSearch("  su  ", null).enabled).toBe(false);
  });

  it("searches from 3 letters, trimmed", () => {
    expect(exerciseSearch("  sup ", null)).toEqual({ muscleGroupId: null, q: "sup", enabled: true });
  });

  it("a group alone is enough, and drops 1-2 letters rather than sending them", () => {
    expect(exerciseSearch("", 2)).toEqual({ muscleGroupId: 2, q: "", enabled: true });
    expect(exerciseSearch("re", 2)).toEqual({ muscleGroupId: 2, q: "", enabled: true });
    expect(exerciseSearch("rem", 2)).toEqual({ muscleGroupId: 2, q: "rem", enabled: true });
  });
});

describe("fetchExercisesPage", () => {
  it("sends the filter and cursor, and nothing that is unset", async () => {
    fetchMock.mockImplementation(async () => Response.json({ exercises: [], nextCursor: null }));

    await fetchExercisesPage({ muscleGroupId: 2, q: " rem ", cursor: "30" });
    await fetchExercisesPage({ q: "sup" });

    expect(Object.fromEntries(sentUrl(0).searchParams)).toEqual({ muscleGroupId: "2", q: "rem", cursor: "30" });
    expect(Object.fromEntries(sentUrl(1).searchParams)).toEqual({ q: "sup" });
  });
});

describe("fetchAllExercises", () => {
  it("follows nextCursor until the last page, 50 at a time", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ exercises: [row(1), row(2)], nextCursor: "50" }))
      .mockResolvedValueOnce(Response.json({ exercises: [row(3)], nextCursor: null }));

    const all = await fetchAllExercises();

    expect(all.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(Object.fromEntries(sentUrl(0).searchParams)).toEqual({ limit: "50" });
    expect(Object.fromEntries(sentUrl(1).searchParams)).toEqual({ limit: "50", cursor: "50" });
  });
});
