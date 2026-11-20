import { describe, expect, it } from "vitest";
import { bffPathAllowed } from "./bffAllowList";

describe("bffPathAllowed: admin host", () => {
  it.each([
    ["GET", "/admin/dashboard"],
    ["GET", "/admin/users"],
    ["POST", "/admin/users/4/suspend"],
    ["DELETE", "/admin/relationships/1/2"],
    ["GET", "/admin"],
    ["GET", "/auth/me"],
    ["POST", "/auth/password"],
    ["post", "/auth/password"],
    ["POST", "/auth/me/consent"],
    ["GET", "/muscle-groups"],
  ])("allows %s %s", (method, path) => {
    expect(bffPathAllowed("admin", method, path)).toBe(true);
  });

  it.each([
    ["PATCH", "/auth/me"],
    ["DELETE", "/auth/me"],
    ["GET", "/auth/me/export"],
    ["POST", "/auth/me"],
    ["GET", "/auth/password"],
    ["POST", "/muscle-groups"],
    ["GET", "/exercises"],
    ["GET", "/clients"],
    ["GET", "/dashboard"],
    ["POST", "/admin/auth/login"],
    ["POST", "/admin/auth/verify"],
    ["POST", "/admin/auth/renew"],
    ["POST", "/Admin/Auth/renew"],
    ["GET", "/admin/auth"],
    ["GET", "/administrators"],
  ])("refuses %s %s", (method, path) => {
    expect(bffPathAllowed("admin", method, path)).toBe(false);
  });
});

describe("bffPathAllowed: www", () => {
  it.each([
    ["GET", "/clients"],
    ["PATCH", "/auth/me"],
    ["DELETE", "/auth/me"],
    ["GET", "/auth/me/export"],
    ["GET", "/exercises"],
    ["GET", "/administrators"],
  ])("allows %s %s", (method, path) => {
    expect(bffPathAllowed("trainer", method, path)).toBe(true);
  });

  it.each([
    ["GET", "/admin"],
    ["GET", "/admin/users"],
    ["GET", "/ADMIN/users"],
    ["POST", "/admin/auth/login"],
    ["POST", "/admin/auth/renew"],
  ])("refuses %s %s", (method, path) => {
    expect(bffPathAllowed("trainer", method, path)).toBe(false);
  });
});

describe("bffPathAllowed: the assistant stream", () => {
  it.each([
    ["trainer", "POST", "/assistant/workout-chat"],
    ["trainer", "POST", "/Assistant/Workout-Chat"],
    ["admin", "POST", "/assistant/workout-chat"],
    ["admin", "GET", "/assistant/status"],
  ] as const)("refuses %s %s %s on the buffering proxy", (workspace, method, path) => {
    expect(bffPathAllowed(workspace, method, path)).toBe(false);
  });

  it("forwards the capability check from www", () => {
    expect(bffPathAllowed("trainer", "GET", "/assistant/status")).toBe(true);
  });
});
