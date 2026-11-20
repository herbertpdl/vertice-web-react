/**
 * A positive whole number written in plain digits: no sign, no leading zero, no decimal point or
 * exponent, and a safe integer (≤ `Number.MAX_SAFE_INTEGER`, so it never lands on another id after
 * rounding). Anything else is `undefined`. The caller trims when it wants surrounding spaces ignored.
 */
export function parsePositiveId(text: string | undefined): number | undefined {
  if (!text || !/^[1-9]\d{0,15}$/.test(text)) return undefined;
  const id = Number(text);
  return Number.isSafeInteger(id) ? id : undefined;
}
