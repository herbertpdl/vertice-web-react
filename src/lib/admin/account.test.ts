import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  EMAIL_FAILED_MESSAGE,
  EMAIL_UNAVAILABLE_MESSAGE,
  emailErrorMessage,
  isRelationshipGone,
  isStaleStatus,
  reasonFieldError,
} from "./account";

const err = (status: number, code: string, extra: { retryAfter?: number; details?: unknown } = {}) =>
  new ApiError({ code, message: "English", details: extra.details }, status, extra.retryAfter);

describe("emailErrorMessage (admin-panel spec §6)", () => {
  it("409 PRECONDITION_FAILED: sending is switched off", () => {
    expect(emailErrorMessage(err(409, "PRECONDITION_FAILED"))).toBe(EMAIL_UNAVAILABLE_MESSAGE);
  });

  it("503 UPSTREAM_UNAVAILABLE and unknown failures: try again", () => {
    expect(emailErrorMessage(err(503, "UPSTREAM_UNAVAILABLE"))).toBe(EMAIL_FAILED_MESSAGE);
    expect(emailErrorMessage(new TypeError("network"))).toBe(EMAIL_FAILED_MESSAGE);
  });

  it("429: the Retry-After wait", () => {
    expect(emailErrorMessage(err(429, "RATE_LIMITED", { retryAfter: 120 }))).toBe(
      "Muitas tentativas. Tente novamente em 2 minutos.",
    );
  });

  it("404: the generic not-found copy, never the BFF's English", () => {
    expect(emailErrorMessage(err(404, "NOT_FOUND"))).toBe("Não encontrado. Ele pode ter sido removido.");
  });
});

describe("isStaleStatus / isRelationshipGone", () => {
  it("a 409 or 404 on suspend/reactivate means the profile is stale", () => {
    expect(isStaleStatus(err(409, "PRECONDITION_FAILED"))).toBe(true);
    expect(isStaleStatus(err(404, "NOT_FOUND"))).toBe(true);
    expect(isStaleStatus(err(503, "UPSTREAM_UNAVAILABLE"))).toBe(false);
  });

  it("a 404 or 403 on end-relationship means it already ended", () => {
    expect(isRelationshipGone(err(404, "NOT_FOUND"))).toBe(true);
    expect(isRelationshipGone(err(403, "FORBIDDEN"))).toBe(true);
    expect(isRelationshipGone(err(500, "INTERNAL_ERROR"))).toBe(false);
  });
});

describe("reasonFieldError", () => {
  it("maps the BFF's reason field error", () => {
    const error = err(400, "VALIDATION_ERROR", { details: { formErrors: [], fieldErrors: { reason: ["too long"] } } });
    expect(reasonFieldError(error)).toBe("Informe um motivo de 1 a 500 caracteres.");
  });

  it("ignores other validation errors and other codes", () => {
    expect(reasonFieldError(err(400, "VALIDATION_ERROR", { details: { fieldErrors: {} } }))).toBeNull();
    expect(reasonFieldError(err(409, "PRECONDITION_FAILED"))).toBeNull();
  });
});
