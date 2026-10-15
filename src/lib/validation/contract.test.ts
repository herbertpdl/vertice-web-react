import { describe, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import type { DayOfWeek, PlanLevel, SetStrategy } from "@/lib/api/types";
import { setStrategySchema } from "./exerciseSets";
import { planLevelSchema } from "./trainingPlans";
import { dayOfWeekSchema } from "./workouts";

/**
 * The enums the forms validate against are written out by hand here (Zod needs the members at
 * runtime; `src/lib/api/schema.ts` is types only). These assertions tie each list to the
 * generated contract union, so a member added, removed or renamed in vertice-bff's OpenAPI
 * document fails `npm run typecheck` instead of reaching a form that silently rejects a value
 * the platform accepts, or offers one it does not (XREPO-013). `toEqualTypeOf` is checked by
 * `tsc`, which is what `npm run typecheck` runs over this file.
 */
describe("the form enums cover exactly the contract's enums", () => {
  it("DayOfWeek", () => {
    expectTypeOf<z.infer<typeof dayOfWeekSchema>>().toEqualTypeOf<DayOfWeek>();
  });

  it("SetStrategy", () => {
    expectTypeOf<z.infer<typeof setStrategySchema>>().toEqualTypeOf<SetStrategy>();
  });

  it("PlanLevel", () => {
    expectTypeOf<z.infer<typeof planLevelSchema>>().toEqualTypeOf<PlanLevel>();
  });
});
