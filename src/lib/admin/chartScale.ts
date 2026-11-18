/**
 * The y axis of the dashboard's weekly sign-ups chart (admin-panel spec W13): four ticks, 0 and
 * three equal steps, the step rounded up to 1, 2 or 5 × 10ⁿ so the labels stay round (a largest
 * bar of 52 gives 0 / 20 / 40 / 60, as frame `izEoo` shows). An empty chart still has a scale
 * (0 / 1 / 2 / 3), so the axis never collapses or divides by zero.
 */
export const CHART_STEPS = 3;

export function niceStep(rawStep: number): number {
  if (rawStep <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  for (const factor of [1, 2, 5, 10]) {
    const step = factor * magnitude;
    if (step >= rawStep) return step;
  }
  return 10 * magnitude;
}

/** The ticks, top first (`[60, 40, 20, 0]`), and the axis top they scale bars against. */
export function chartScale(maxValue: number): { ticks: number[]; top: number } {
  const step = niceStep(Math.ceil(Math.max(0, maxValue) / CHART_STEPS));
  const top = step * CHART_STEPS;
  const ticks = Array.from({ length: CHART_STEPS + 1 }, (_, i) => top - i * step);
  return { ticks, top };
}
