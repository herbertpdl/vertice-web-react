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

export function rateLimitMessage(retryAfterSeconds?: number): string {
  const prefix = "Muitas tentativas.";
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
