import { describe, expect, it } from "vitest";
import { exerciseSchema } from "./exercises";

const valid = { name: "Remada Unilateral", muscleGroupIds: [2], description: "", videoUrl: "" };

function messages(input: unknown) {
  const result = exerciseSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

describe("exerciseSchema", () => {
  it('rejects an empty muscleGroupIds with "Selecione pelo menos um grupo muscular"', () => {
    expect(messages({ ...valid, muscleGroupIds: [] })).toEqual([
      "Selecione pelo menos um grupo muscular",
    ]);
  });

  it("accepts one or more group ids", () => {
    expect(exerciseSchema.safeParse(valid).success).toBe(true);
    expect(exerciseSchema.safeParse({ ...valid, muscleGroupIds: [2, 4, 12] }).success).toBe(true);
  });

  it("accepts an empty videoUrl and rejects a non-URL", () => {
    expect(exerciseSchema.safeParse({ ...valid, videoUrl: "" }).success).toBe(true);
    expect(
      exerciseSchema.safeParse({ ...valid, videoUrl: "https://example.com/remada" }).success,
    ).toBe(true);
    expect(messages({ ...valid, videoUrl: "not a url" })).toEqual(["URL inválida"]);
  });

  it("requires a name", () => {
    expect(messages({ ...valid, name: "" })).toEqual(["Informe o nome do exercício"]);
  });
});
