import { z } from "zod";
import { addDays } from "@/lib/calendar";
import { formatDateNumeric, todayLocalIso } from "@/lib/format";
import { DESCRIPTION_MAX, NAME_MAX, boundedText, requiredText } from "./bounds";

export const planLevelSchema = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);

export const planLevelLabels: Record<z.infer<typeof planLevelSchema>, string> = {
  BEGINNER: "Iniciante",
  INTERMEDIATE: "Intermediário",
  ADVANCED: "Avançado",
};

const isoDate = (requiredMessage: string) =>
  z.string().min(1, requiredMessage).regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

/**
 * The earliest day a plan may start.
 *
 * A new plan can't start in the past, but an existing one often already has — and the same dialog
 * edits it, so a flat "today" floor would make an active plan unsaveable until its start date was
 * dragged forward, even when all the trainer wanted was to fix a typo in its name. The floor is
 * therefore today, *or* the date the plan already carries when that is earlier: you can't move a
 * start date further back than it already is, and you are never forced to move it forward.
 */
export function minPlanStartDate(currentStartDate?: string, today: string = todayLocalIso()) {
  // Business dates compare as plain strings — no `Date`, no zone. See `src/lib/format.ts`.
  return currentStartDate && currentStartDate < today ? currentStartDate : today;
}

/** The earliest day a plan may end: the day after it starts, since it can't end the day it begins. */
export function minPlanEndDate(startDate: string, minStartDate: string) {
  return addDays(startDate || minStartDate, 1);
}

/**
 * Built per dialog rather than exported as a constant, because its lower bound depends on the plan
 * being edited (see `minPlanStartDate`) and on what day it is.
 */
export function trainingPlanSchema(minStartDate: string = todayLocalIso()) {
  return z
    .object({
      name: requiredText(NAME_MAX, "Informe o nome do plano"),
      description: boundedText(DESCRIPTION_MAX),
      startDate: isoDate("Informe a data de início"),
      endDate: isoDate("Informe a data de término"),
      level: planLevelSchema,
    })
    .refine((data) => data.startDate >= minStartDate, {
      message: `A data de início não pode ser anterior a ${formatDateNumeric(minStartDate)}`,
      path: ["startDate"],
    })
    .refine((data) => data.endDate > data.startDate, {
      message: "O plano precisa terminar depois do dia em que começa",
      path: ["endDate"],
    });
}

export type TrainingPlanFormInput = z.infer<ReturnType<typeof trainingPlanSchema>>;
