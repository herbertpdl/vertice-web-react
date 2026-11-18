import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { loginErrorMessage } from "./loginErrorMessage";

function apiError(code: string, status: number) {
  return new ApiError({ code, message: "English text for logs" }, status);
}

describe("loginErrorMessage", () => {
  it("a 401 reads as a wrong e-mail or password", () => {
    expect(loginErrorMessage(apiError("UNAUTHORIZED", 401))).toBe("E-mail ou senha inválidos");
  });

  it("TRAINERS_ONLY (a client's, or an admin's mapped ADMIN_LOGIN_ELSEWHERE) reads as today", () => {
    expect(loginErrorMessage(apiError("TRAINERS_ONLY", 403))).toBe(
      "O acesso de alunos é feito somente pelo aplicativo Vertice.",
    );
  });

  it("ACCOUNT_SUSPENDED shows the R41 text", () => {
    expect(loginErrorMessage(apiError("ACCOUNT_SUSPENDED", 403))).toBe(
      "Sua conta está suspensa. Entre em contato com o suporte.",
    );
  });

  it("never shows the BFF's English message for other codes", () => {
    expect(loginErrorMessage(apiError("FORBIDDEN", 403))).toBe("Você não tem acesso a este recurso.");
    expect(loginErrorMessage(new Error("boom"))).toBe("Não foi possível entrar");
  });
});
