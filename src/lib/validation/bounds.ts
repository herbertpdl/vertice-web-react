import { z } from "zod";

/**
 * Field rules shared by every schema. They mirror vertice-api's validation (its PR #70 is the table
 * of record) and vertice-bff's `lib/validation.ts`, so a bad value is caught in the form before any
 * request. String lengths count UTF-16 code units, like Java's `String.length()`, so `.max(n)` is the
 * same bound on all three layers.
 */

export const NAME_MAX = 255;
export const EMAIL_MAX = 255;
export const DESCRIPTION_MAX = 255;
export const NOTES_MAX = 255;
export const CREF_MAX = 20;
export const VIDEO_URL_MAX = 500;
export const FEEDBACK_MAX = 2000;

export const ORDER_MAX = 1000;
export const REPS_MAX = 1000;
export const DURATION_SECONDS_MAX = 86_400;
export const REST_SECONDS_MAX = 3600;

/** Caps vertice-api enforces per workout / per exercise, and 10 feedback entries per workout log. */
export const MAX_EXERCISES_PER_WORKOUT = 20;
export const MAX_SETS_PER_EXERCISE = 10;
export const MAX_FEEDBACK_PER_LOG = 10;

/** `weight`: at most 4 integer digits and 2 decimals (`NUMERIC(6,2)`), dot separator. */
export const WEIGHT_PATTERN = /^\d{1,4}(\.\d{1,2})?$/;
/** `loadPercentage`: at most 3 integer digits and 2 decimals (`NUMERIC(5,2)`), dot separator. */
export const LOAD_PERCENTAGE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

export const tooLong = (max: number) => `Use no máximo ${max} caracteres`;

/** A required text: not blank, at most `max` characters (checked on the raw value, stored trimmed). */
export const requiredText = (max: number, requiredMessage: string) =>
  z.string().max(max, tooLong(max)).trim().min(1, requiredMessage);

/** An optional free text with a column bound. */
export const boundedText = (max: number) => z.string().max(max, tooLong(max));

/** Trimmed, lower-cased, at most 255 characters: the way vertice-api stores emails. */
export const emailField = (requiredMessage = "Informe o e-mail") =>
  z
    .string()
    .trim()
    .toLowerCase()
    .min(1, requiredMessage)
    .email("E-mail inválido")
    .max(EMAIL_MAX, tooLong(EMAIL_MAX));

export const weightMessage = "Use até 4 dígitos inteiros e 2 decimais";
export const loadPercentageMessage = "Use até 3 dígitos inteiros e 2 decimais";

/** An optional decimal (dot separator); an empty string means "unset". */
export const optionalDecimal = (pattern: RegExp, message: string) =>
  z.string().regex(pattern, message).or(z.literal("")).optional();

/** Integer bounds vertice-api enforces on every write RPC. */
export const orderNumber = z.number().int().min(1).max(ORDER_MAX);
export const repsCount = z.number().int().min(0, "Valor inválido").max(REPS_MAX, `No máximo ${REPS_MAX}`);
export const durationSeconds = z
  .number()
  .int()
  .min(0)
  .max(DURATION_SECONDS_MAX, `No máximo ${DURATION_SECONDS_MAX} segundos`);
export const restSeconds = z
  .number()
  .int()
  .min(0)
  .max(REST_SECONDS_MAX, `No máximo ${REST_SECONDS_MAX} segundos`);

/** Only `http:` / `https:` URLs may be linked: the catalog is shared, so `javascript:`/`data:` never. */
export const HTTP_URL_PATTERN = /^https?:\/\/\S+$/;
/** Render side: lenient on scheme case, for data stored before the rule. */
const RENDERABLE_URL_PATTERN = /^https?:\/\/\S+$/i;

/** The URL when it is a well-formed http(s) one, otherwise `null` (render no link). */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url || !RENDERABLE_URL_PATTERN.test(url)) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}
