import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { signInFailure } from "./errors";

const err = (status: number, code: string, retryAfter?: number) => new ApiError({ code, message: code }, status, retryAfter);

describe("signInFailure (admin-panel spec W10)", () => {
  it("reads a 401 at the password as invalid credentials, whatever the role (R4)", () => {
    expect(signInFailure(err(401, "UNAUTHORIZED"), "login")).toEqual({ kind: "message", message: "E-mail ou senha inválidos" });
  });

  it("shows the R41 text for a suspended account", () => {
    expect(signInFailure(err(403, "ACCOUNT_SUSPENDED"), "login")).toEqual({
      kind: "message",
      message: "Sua conta está suspensa. Entre em contato com o suporte.",
    });
  });

  it.each(["login", "enroll", "verify"] as const)("shows the rate-limit copy with its wait at %s", (step) => {
    expect(signInFailure(err(429, "RATE_LIMITED", 900), step)).toEqual({
      kind: "message",
      message: "Muitas tentativas. Tente novamente em 15 minutos.",
      retryAfter: 900,
    });
  });

  it("keeps the challenge on a wrong code", () => {
    expect(signInFailure(err(400, "INVALID_SECOND_FACTOR_CODE"), "verify")).toEqual({ kind: "codeRejected" });
  });

  it.each([
    [err(401, "CHALLENGE_INVALID"), "verify"],
    [err(401, "CHALLENGE_INVALID"), "enroll"],
    [err(409, "PRECONDITION_FAILED"), "verify"],
  ] as const)("restarts on %s at %s", (error, step) => {
    expect(signInFailure(error, step)).toEqual({ kind: "challengeEnded" });
  });

  it("moves to the code step on a 409 at enroll", () => {
    expect(signInFailure(err(409, "PRECONDITION_FAILED"), "enroll")).toEqual({ kind: "alreadyEnrolled" });
  });

  it("falls back to a generic message", () => {
    expect(signInFailure(err(503, "UPSTREAM_UNAVAILABLE"), "verify").kind).toBe("message");
    expect(signInFailure(new Error("network"), "login").kind).toBe("message");
  });
});
