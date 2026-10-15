// 429 RATE_LIMITED handling. The BFF sends `Retry-After` in seconds; an HTTP-date is accepted
// too, since a proxy in between may rewrite it.

export function parseRetryAfter(
  value: string | null | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const date = Date.parse(trimmed);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - now) / 1000));
}

/** `prefix` is the first sentence: what was limited ("Muitas tentativas." by default). */
export function rateLimitMessage(retryAfterSeconds?: number, prefix = "Muitas tentativas."): string {
  if (retryAfterSeconds === undefined || retryAfterSeconds <= 0) {
    return `${prefix} Aguarde alguns minutos e tente novamente.`;
  }
  if (retryAfterSeconds < 60) {
    return `${prefix} Tente novamente em ${retryAfterSeconds} ${
      retryAfterSeconds === 1 ? "segundo" : "segundos"
    }.`;
  }
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `${prefix} Tente novamente em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}

/**
 * The pt-BR message for a 429 RATE_LIMITED error (an ApiError with `retryAfter`), or `undefined`
 * for any other error, so call sites can fall through to their own handling. Structural rather
 * than `instanceof ApiError`: client.ts imports this module.
 */
export function rateLimitedMessage(error: unknown, prefix?: string): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { status, retryAfter } = error as { status?: unknown; retryAfter?: unknown };
  if (status !== 429) return undefined;
  return rateLimitMessage(typeof retryAfter === "number" ? retryAfter : undefined, prefix);
}
