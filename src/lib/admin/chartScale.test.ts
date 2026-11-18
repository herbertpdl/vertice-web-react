import { describe, expect, it } from "vitest";
import { chartScale, niceStep } from "./chartScale";

describe("niceStep", () => {
  it("rounds up to 1, 2 or 5 × 10ⁿ", () => {
    expect(niceStep(0)).toBe(1);
    expect(niceStep(1)).toBe(1);
    expect(niceStep(2)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(6)).toBe(10);
    expect(niceStep(18)).toBe(20);
    expect(niceStep(21)).toBe(50);
    expect(niceStep(51)).toBe(100);
    expect(niceStep(334)).toBe(500);
  });
});

describe("chartScale", () => {
  it("matches the frame: a largest week of 52 gives 60 / 40 / 20 / 0", () => {
    expect(chartScale(52)).toEqual({ ticks: [60, 40, 20, 0], top: 60 });
  });

  it("keeps a scale for an all-zero chart", () => {
    expect(chartScale(0)).toEqual({ ticks: [3, 2, 1, 0], top: 3 });
  });

  it("always reaches the largest value", () => {
    for (const max of [1, 3, 4, 7, 10, 31, 99, 100, 101, 999, 12_345]) {
      const { top, ticks } = chartScale(max);
      expect(top).toBeGreaterThanOrEqual(max);
      expect(ticks).toHaveLength(4);
      expect(ticks.at(-1)).toBe(0);
    }
  });
});
