import { describe, expect, it } from "vitest";
import { parseRetryAfter, rateLimitMessage } from "./rateLimit";

describe("parseRetryAfter", () => {
  it("reads delta-seconds", () => {
    expect(parseRetryAfter("120")).toBe(120);
    expect(parseRetryAfter(" 5 ")).toBe(5);
  });

  it("reads an HTTP-date relative to now", () => {
    const now = Date.parse("2026-10-13T12:00:00Z");
    expect(parseRetryAfter("Tue, 13 Oct 2026 12:01:30 GMT", now)).toBe(90);
    expect(parseRetryAfter("Tue, 13 Oct 2026 11:00:00 GMT", now)).toBe(0);
  });

  it("ignores a missing or unreadable value", () => {
    expect(parseRetryAfter(null)).toBeUndefined();
    expect(parseRetryAfter("")).toBeUndefined();
    expect(parseRetryAfter("soon")).toBeUndefined();
  });
});

describe("rateLimitMessage", () => {
  it("falls back to a generic wait without Retry-After", () => {
    expect(rateLimitMessage()).toBe("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  });

  it("uses seconds under a minute", () => {
    expect(rateLimitMessage(1)).toBe("Muitas tentativas. Tente novamente em 1 segundo.");
    expect(rateLimitMessage(30)).toBe("Muitas tentativas. Tente novamente em 30 segundos.");
  });

  it("rounds up to whole minutes", () => {
    expect(rateLimitMessage(60)).toBe("Muitas tentativas. Tente novamente em 1 minuto.");
    expect(rateLimitMessage(61)).toBe("Muitas tentativas. Tente novamente em 2 minutos.");
    expect(rateLimitMessage(900)).toBe("Muitas tentativas. Tente novamente em 15 minutos.");
  });
});
