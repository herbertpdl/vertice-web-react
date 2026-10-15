import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { parseRetryAfter, rateLimitedMessage, rateLimitMessage } from "./rateLimit";

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

  it("takes another first sentence", () => {
    expect(rateLimitMessage(2400, "Limite de exportações atingido.")).toBe(
      "Limite de exportações atingido. Tente novamente em 40 minutos.",
    );
  });

  it("rounds up to whole minutes", () => {
    expect(rateLimitMessage(60)).toBe("Muitas tentativas. Tente novamente em 1 minuto.");
    expect(rateLimitMessage(61)).toBe("Muitas tentativas. Tente novamente em 2 minutos.");
    expect(rateLimitMessage(900)).toBe("Muitas tentativas. Tente novamente em 15 minutos.");
  });
});

describe("rateLimitedMessage", () => {
  it("returns the message for a 429 ApiError, using its retryAfter", () => {
    expect(
      rateLimitedMessage(new ApiError({ code: "RATE_LIMITED", message: "x" }, 429, 120)),
    ).toBe("Muitas tentativas. Tente novamente em 2 minutos.");
    expect(rateLimitedMessage(new ApiError({ code: "RATE_LIMITED", message: "x" }, 429))).toBe(
      "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    );
  });

  it("returns undefined for anything else", () => {
    expect(rateLimitedMessage(new ApiError({ code: "CONFLICT", message: "x" }, 409))).toBeUndefined();
    expect(rateLimitedMessage(new Error("boom"))).toBeUndefined();
    expect(rateLimitedMessage(null)).toBeUndefined();
  });
});
