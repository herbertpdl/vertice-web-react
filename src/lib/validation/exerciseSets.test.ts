import { describe, expect, it } from "vitest";
import { setStrategyDescription, setStrategyDescriptions } from "./exerciseSets";

describe("setStrategyDescription", () => {
  it("is the strategy's own description", () => {
    expect(setStrategyDescription("FAILURE", false)).toBe(setStrategyDescriptions.FAILURE);
    expect(setStrategyDescription("DROPSET", true)).toBe(setStrategyDescriptions.DROPSET);
  });

  it("names the hold button for Isometria only on a timed set", () => {
    expect(setStrategyDescription("ISOMETRIC_HOLD", true)).toBe(
      "Segure a posição parada pelo tempo indicado. Use o botão ▶ para cronometrar.",
    );
    expect(setStrategyDescription("ISOMETRIC_HOLD", false)).toBe(
      "Segure a posição parada por alguns segundos em cada repetição, sem mover.",
    );
  });
});
