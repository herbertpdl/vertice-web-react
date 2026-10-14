import { describe, expect, it } from "vitest";
import { DEFAULT_REDIRECT, safeRedirectPath } from "./safeRedirect";

const ORIGIN = "https://app.vertice.test";

describe("safeRedirectPath", () => {
  it.each([
    ["/alunos", "/alunos"],
    ["/alunos/42?tab=planos", "/alunos/42?tab=planos"],
    ["/planos/7/treinos/novo?dayOfWeek=MONDAY#top", "/planos/7/treinos/novo?dayOfWeek=MONDAY#top"],
    ["/dashboard/../exercicios", "/exercicios"],
  ])("keeps the same-origin path %j", (value, expected) => {
    expect(safeRedirectPath(value, ORIGIN)).toBe(expected);
  });

  it.each([
    ["missing", null],
    ["undefined", undefined],
    ["empty", ""],
    ["absolute URL", "https://evil.example/login"],
    ["absolute URL on our own host", `${ORIGIN}/alunos`],
    ["protocol-relative", "//evil.example"],
    ["protocol-relative with path", "//evil.example/login"],
    ["backslash", "/\\evil.example"],
    ["double backslash", "\\\\evil.example"],
    ["backslash later in the path", "/alunos\\..\\..\\evil"],
    ["tab inside //", "/\t/evil.example"],
    ["newline inside //", "/\n/evil.example"],
    ["carriage return inside //", "/\r/evil.example"],
    ["leading tab", "\t//evil.example"],
    ["leading space", " /alunos"],
    ["javascript: scheme", "javascript:alert(1)"],
    ["JavaScript: scheme, mixed case", "JaVaScRiPt:alert(1)"],
    ["data: scheme", "data:text/html,<script>alert(1)</script>"],
    ["relative path", "alunos"],
    ["encoded //", "/%2F%2Fevil.example"],
    ["encoded /\\", "/%5Cevil.example"],
    ["encoded leading slash", "%2F%2Fevil.example"],
    ["encoded tab", "/%09/evil.example"],
    ["encoded newline", "/%0A/evil.example"],
    ["malformed escape", "/alunos%E0%A4%A"],
  ])("falls back to the dashboard for %s", (_label, value) => {
    expect(safeRedirectPath(value, ORIGIN)).toBe(DEFAULT_REDIRECT);
  });

  it("compares against the origin it is given, not a fixed host", () => {
    expect(safeRedirectPath("/alunos", "http://localhost:5173")).toBe("/alunos");
  });
});
