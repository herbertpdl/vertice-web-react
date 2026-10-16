import { z } from "zod";
import { NAME_MAX, requiredText } from "./bounds";

export const dayOfWeekSchema = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

// Weekday labels are not here: `src/lib/days.ts` is the one file for them (XREPO-013).
// DAY_NAMES, DAY_ABBR, DAY_NAME_LOWER and DAY_NAMES_LONG are keyed by the contract's
// `DayOfWeek`; DAY_INITIAL by `WeekdayLabel`, the Monday-to-Friday subset `GET /clients`
// sends in `weekActivity`.

export const workoutSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome do treino"),
  dayOfWeek: dayOfWeekSchema,
});

export type WorkoutFormInput = z.infer<typeof workoutSchema>;
