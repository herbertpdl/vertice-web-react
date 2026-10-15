import { describe, expect, it } from "vitest";
import { ApiError } from "./client";
import { apiErrorMessage, errorMessages } from "./errorMessages";

function apiError(code: string, status: number, message = "English upstream text", retryAfter?: number) {
  return new ApiError({ code, message }, status, retryAfter);
}

describe("apiErrorMessage", () => {
  it.each([
    ["VALIDATION_ERROR", 400],
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["PRECONDITION_FAILED", 409],
    ["INVALID_CURRENT_PASSWORD", 400],
    ["ACTIVE_CLIENTS", 409],
    ["TOO_LARGE", 413],
    ["UPSTREAM_ERROR", 502],
    ["UPSTREAM_UNAVAILABLE", 503],
  ])("maps %s to its pt-BR copy, never the BFF's message", (code, status) => {
    const message = apiErrorMessage(apiError(code, status), "fallback");
    expect(message).toBe(errorMessages[code]);
    expect(message).not.toContain("English upstream text");
  });

  it("says a duplicate is the email or the CPF, without saying which", () => {
    expect(apiErrorMessage(apiError("CONFLICT", 409, "Email or CPF already in use"), "x")).toBe(
      "E-mail ou CPF já cadastrado",
    );
  });

  it("uses the rate-limit copy for a 429", () => {
    expect(apiErrorMessage(apiError("RATE_LIMITED", 429, "Too many", 30), "x")).toBe(
      "Muitas tentativas. Tente novamente em 30 segundos.",
    );
  });

  it("falls back for an unknown code, a prototype key and a non-API error", () => {
    expect(apiErrorMessage(apiError("SOMETHING_NEW", 500), "fallback")).toBe("fallback");
    expect(apiErrorMessage(apiError("constructor", 500), "fallback")).toBe("fallback");
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "fallback")).toBe("fallback");
    expect(apiErrorMessage(undefined, "fallback")).toBe("fallback");
  });
});
