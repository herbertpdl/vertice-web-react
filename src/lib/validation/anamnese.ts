import { ANAMNESE_MAX } from "./bounds";

/**
 * R19: a text of only whitespace means "no anamnese". `trim()` strips the same set the API treats
 * as blank (Unicode white space, U+00A0 and line breaks included).
 */
export function isBlankAnamnese(text: string): boolean {
  return text.trim() === "";
}

/** UTF-16 units, the way all three layers count the 5,000 (R10). */
export function anamneseLength(text: string): number {
  return text.length;
}

export function isOverAnamneseLimit(text: string): boolean {
  return anamneseLength(text) > ANAMNESE_MAX;
}

/** How many characters to delete before it can be saved (0 when within the limit, E2). */
export function anamneseExcess(text: string): number {
  return Math.max(0, anamneseLength(text) - ANAMNESE_MAX);
}
