import { afterEach, describe, expect, it, vi } from "vitest";

const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => store }));

import {
  adminTokenTimes,
  clearAdminChallenge,
  clearAdminSession,
  getAdminChallenge,
  getAdminSessionToken,
  secondsUntil,
  setAdminChallenge,
  setAdminSession,
} from "./adminSession";
import { resetServerEnvForTests } from "./env.server";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  store.set.mockReset();
  store.get.mockReset();
});

const NOW = Date.parse("2026-11-18T12:00:00Z");

function production() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
}

export function jwtWith(payload: object): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256" })}.${part(payload)}.sig`;
}

describe("admin session cookie (W6)", () => {
  it("is __Host-, HttpOnly, Secure, Strict, Path=/ in production, living exactly until expiresAt", async () => {
    production();
    await setAdminSession("jwt", "2026-11-18T12:30:00Z", NOW);
    expect(store.set).toHaveBeenCalledWith("__Host-vertice_admin", "jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 1800,
    });
    // No Domain anywhere: the cookie stays on the admin host.
    expect(store.set.mock.calls[0][2]).not.toHaveProperty("domain");
  });

  it("drops the prefix and Secure outside production", async () => {
    await setAdminSession("jwt", "2026-11-18T12:30:00Z", NOW);
    expect(store.set.mock.calls[0][0]).toBe("vertice_admin");
    expect(store.set.mock.calls[0][2]).toMatchObject({ secure: false, maxAge: 1800 });
  });

  it("reads and clears the same name, clearing with the attributes a __Host- cookie needs", async () => {
    production();
    store.get.mockReturnValue({ value: "jwt" });
    expect(await getAdminSessionToken()).toBe("jwt");
    expect(store.get).toHaveBeenCalledWith("__Host-vertice_admin");
    await clearAdminSession();
    expect(store.set).toHaveBeenCalledWith("__Host-vertice_admin", "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  });
});

describe("challenge cookie (W6)", () => {
  it("lives until challengeExpiresAt, and never more than 5 minutes", async () => {
    production();
    await setAdminChallenge("c", "2026-11-18T12:04:00Z", NOW);
    expect(store.set).toHaveBeenLastCalledWith("__Host-vertice_admin_challenge", "c", expect.objectContaining({ maxAge: 240, httpOnly: true, secure: true, sameSite: "strict", path: "/" }));
    await setAdminChallenge("c", "2026-11-18T13:00:00Z", NOW);
    expect(store.set.mock.lastCall![2].maxAge).toBe(300);
  });

  it("reads and clears its own name", async () => {
    store.get.mockReturnValue({ value: "c" });
    expect(await getAdminChallenge()).toBe("c");
    expect(store.get).toHaveBeenCalledWith("vertice_admin_challenge");
    await clearAdminChallenge();
    expect(store.set).toHaveBeenLastCalledWith("vertice_admin_challenge", "", expect.objectContaining({ maxAge: 0 }));
  });
});

describe("secondsUntil", () => {
  it("floors, never negative, 0 for garbage", () => {
    expect(secondsUntil("2026-11-18T12:00:10.900Z", NOW)).toBe(10);
    expect(secondsUntil("2026-11-18T11:00:00Z", NOW)).toBe(0);
    expect(secondsUntil("nope", NOW)).toBe(0);
  });
});

describe("adminTokenTimes", () => {
  it("reads iat, exp and auth_time + 12 h", () => {
    const iat = NOW / 1000;
    expect(adminTokenTimes(jwtWith({ iat, exp: iat + 1800, auth_time: iat - 3600 }))).toEqual({
      issuedAt: "2026-11-18T12:00:00.000Z",
      expiresAt: "2026-11-18T12:30:00.000Z",
      sessionEndsAt: "2026-11-18T23:00:00.000Z",
    });
  });

  it.each([
    ["no payload", "abc"],
    ["not JSON", "a.bm90IGpzb24.c"],
    ["no auth_time", jwtWith({ iat: 1, exp: 2 })],
    ["a string exp", jwtWith({ iat: 1, exp: "2", auth_time: 1 })],
  ])("is undefined for %s", (_label, token) => {
    expect(adminTokenTimes(token)).toBeUndefined();
  });
});
