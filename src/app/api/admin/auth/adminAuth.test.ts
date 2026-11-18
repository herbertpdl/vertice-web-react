import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// A real cookie jar behind `cookies()`, so these tests see exactly what `adminSession.ts` writes.
const jar = new Map<string, { value: string; options: Record<string, unknown> }>();
const store = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
  set: vi.fn((name: string, value: string, options: Record<string, unknown>) => {
    if (options.maxAge === 0) jar.delete(name);
    else jar.set(name, { value, options });
  }),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));

import { resetServerEnvForTests } from "@/lib/env.server";
import { POST as enroll } from "./enroll/route";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { MIN_RENEW_AGE_MS, POST as renew } from "./renew/route";
import { GET as session } from "./session/route";
import { POST as verify } from "./verify/route";

const ADMIN = "admin.localhost:5173";
const SESSION = "vertice_admin";
const CHALLENGE = "vertice_admin_challenge";
const NOW = Date.parse("2026-11-18T12:00:00Z");
const fetchMock = vi.fn<typeof fetch>();

function call(path: string, { method = "POST", body, host = ADMIN }: { method?: string; body?: unknown; host?: string } = {}) {
  return new NextRequest(`http://${host}/api/admin/auth/${path}`, {
    method,
    headers: {
      Host: host,
      Origin: `http://${host}`,
      "Sec-Fetch-Site": "same-origin",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function jwt(payload: object): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "HS256" })}.${part(payload)}.sig`;
}

/** An admin token issued `ageMs` before NOW, 30 minutes long, signed in an hour before NOW. */
function tokenAged(ageMs: number) {
  const iat = (NOW - ageMs) / 1000;
  return jwt({ role: "ADMIN", iat, exp: iat + 1800, auth_time: NOW / 1000 - 3600 });
}

function bffError(status: number, code: string, headers: Record<string, string> = {}) {
  return Response.json({ error: { code, message: code } }, { status, headers });
}

const user = { id: 1, name: "Carla", email: "carla@vertice.fit", role: "ADMIN" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  fetchMock.mockReset();
  store.set.mockClear();
  jar.clear();
});

describe("on www", () => {
  it.each([
    ["login", login, "POST", { email: "a@b.co", password: "x" }],
    ["enroll", enroll, "POST", undefined],
    ["verify", verify, "POST", { code: "123456" }],
    ["renew", renew, "POST", undefined],
    ["session", session, "GET", undefined],
    ["logout", logout, "POST", undefined],
  ] as const)("/api/admin/auth/%s is a 404 with no BFF call and no cookie", async (path, handler, method, body) => {
    jar.set(SESSION, { value: tokenAged(5 * 60_000), options: {} });
    jar.set(CHALLENGE, { value: "c", options: {} });
    const res = await handler(call(path, { method, body, host: "localhost:5173" }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("is a 404 on the admin hostname too in production with ADMIN_HOST unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    vi.stubEnv("ADMIN_HOST", "");
    const res = await login(call("login", { body: { email: "a@b.co", password: "x" }, host: "admin.vertice.fit" }));
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/auth/login", () => {
  it("sends only email and password, keeps the challenge in its cookie, never in the body", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ challenge: "secret-challenge", challengeExpiresAt: "2026-11-18T12:05:00Z", secondFactor: "NOT_ENROLLED" }),
    );
    const res = await login(call("login", { body: { email: "carla@vertice.fit", password: "x", remember: true } }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({
      secondFactor: "NOT_ENROLLED",
      challengeExpiresAt: "2026-11-18T12:05:00Z",
      challengeExpiresIn: 300,
    });
    expect(text).not.toContain("secret-challenge");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/admin/auth/login");
    expect(JSON.parse(init!.body as string)).toEqual({ email: "carla@vertice.fit", password: "x" });
    expect(jar.get(CHALLENGE)).toEqual({
      value: "secret-challenge",
      options: { httpOnly: true, secure: false, sameSite: "strict", path: "/", maxAge: 300 },
    });
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "ACCOUNT_SUSPENDED"],
  ])("relays %s %s and sets no cookie", async (status, code) => {
    fetchMock.mockResolvedValue(bffError(status, code));
    const res = await login(call("login", { body: { email: "a@b.co", password: "x" } }));
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(code);
    expect(store.set).not.toHaveBeenCalled();
  });

  it("relays 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(bffError(429, "RATE_LIMITED", { "Retry-After": "60" }));
    const res = await login(call("login", { body: { email: "a@b.co", password: "x" } }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
  });

  it("refuses a malformed body with 400 and no BFF call", async () => {
    const res = await login(call("login", { body: { email: "nope" } }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a cross-site post", async () => {
    const request = new NextRequest(`http://${ADMIN}/api/admin/auth/login`, {
      method: "POST",
      headers: { Host: ADMIN, Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.co", password: "x" }),
    });
    expect((await login(request)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/auth/enroll", () => {
  it("answers 401 CHALLENGE_INVALID with no challenge cookie, with no BFF call", async () => {
    const res = await enroll(call("enroll"));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("CHALLENGE_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the cookie's challenge and relays the provisioning URI, no-store", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(Response.json({ provisioningUri: "otpauth://totp/Vertice?secret=ABC" }));
    const res = await enroll(call("enroll"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ provisioningUri: "otpauth://totp/Vertice?secret=ABC" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ challenge: "c" });
  });

  it("clears the challenge on a BFF 401", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(bffError(401, "CHALLENGE_INVALID"));
    const res = await enroll(call("enroll"));
    expect(res.status).toBe(401);
    expect(jar.has(CHALLENGE)).toBe(false);
  });

  it.each([
    [409, "PRECONDITION_FAILED"],
    [429, "RATE_LIMITED"],
  ])("relays %s and keeps the challenge", async (status, code) => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(bffError(status, code));
    const res = await enroll(call("enroll"));
    expect(res.status).toBe(status);
    expect(jar.get(CHALLENGE)?.value).toBe("c");
  });
});

describe("POST /api/admin/auth/verify", () => {
  const admin = { token: "admin-jwt", expiresAt: "2026-11-18T12:30:00Z", sessionEndsAt: "2026-11-19T00:00:00Z", user };

  it.each([undefined, {}, { code: "12345" }, { code: "1234567" }, { code: "12a456" }, { code: 123456 }])(
    "refuses %j with 400 VALIDATION_ERROR and no BFF call",
    async (body) => {
      jar.set(CHALLENGE, { value: "c", options: {} });
      const res = await verify(call("verify", { body: body ?? null }));
      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("answers 401 CHALLENGE_INVALID with no challenge cookie, with no BFF call", async () => {
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("CHALLENGE_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sets the session cookie for the token's lifetime, clears the challenge, never answers the token", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(Response.json(admin));
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ user, expiresAt: admin.expiresAt, sessionEndsAt: admin.sessionEndsAt });
    expect(text).not.toContain("admin-jwt");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ challenge: "c", code: "123456" });
    expect(jar.get(SESSION)).toEqual({
      value: "admin-jwt",
      options: { httpOnly: true, secure: false, sameSite: "strict", path: "/", maxAge: 1800 },
    });
    expect(jar.has(CHALLENGE)).toBe(false);
  });

  it("uses the __Host- names in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    vi.stubEnv("ADMIN_HOST", "admin.vertice.fit");
    jar.set("__Host-vertice_admin_challenge", { value: "c", options: {} });
    fetchMock.mockResolvedValue(Response.json(admin));
    const request = new NextRequest("https://admin.vertice.fit/api/admin/auth/verify", {
      method: "POST",
      headers: { Host: "admin.vertice.fit", Origin: "https://admin.vertice.fit", "Sec-Fetch-Site": "same-origin", "Content-Type": "application/json" },
      body: JSON.stringify({ code: "123456" }),
    });
    expect((await verify(request)).status).toBe(200);
    expect(jar.get("__Host-vertice_admin")?.options).toMatchObject({ secure: true, path: "/", maxAge: 1800 });
    expect(jar.has("__Host-vertice_admin_challenge")).toBe(false);
  });

  it("keeps the challenge on a wrong code, so the admin can try again", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(bffError(400, "INVALID_SECOND_FACTOR_CODE"));
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_SECOND_FACTOR_CODE");
    expect(jar.get(CHALLENGE)?.value).toBe("c");
    expect(jar.has(SESSION)).toBe(false);
  });

  it.each([
    [401, "CHALLENGE_INVALID"],
    [409, "PRECONDITION_FAILED"],
  ])("clears the challenge on %s %s and relays it", async (status, code) => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(bffError(status, code));
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(status);
    expect(jar.has(CHALLENGE)).toBe(false);
  });

  it("relays 429 with Retry-After and keeps the challenge", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(bffError(429, "RATE_LIMITED", { "Retry-After": "900" }));
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
    expect(jar.get(CHALLENGE)?.value).toBe("c");
  });

  it("stores no token whose user isn't an ADMIN", async () => {
    jar.set(CHALLENGE, { value: "c", options: {} });
    fetchMock.mockResolvedValue(Response.json({ ...admin, user: { ...user, role: "TRAINER" } }));
    const res = await verify(call("verify", { body: { code: "123456" } }));
    expect(res.status).toBe(403);
    expect(jar.has(SESSION)).toBe(false);
  });
});

describe("POST /api/admin/auth/renew", () => {
  it("answers 401 and calls nothing without a cookie", async () => {
    const res = await renew(call("renew"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the cookie and calls nothing past exp", async () => {
    jar.set(SESSION, { value: tokenAged(31 * 60_000), options: {} });
    const res = await renew(call("renew"));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(jar.has(SESSION)).toBe(false);
  });

  it("calls nothing under 2 minutes, and answers the current cookie's times", async () => {
    jar.set(SESSION, { value: tokenAged(MIN_RENEW_AGE_MS - 1000), options: {} });
    const res = await renew(call("renew"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      renewed: false,
      expiresAt: "2026-11-18T12:28:01.000Z",
      sessionEndsAt: "2026-11-18T23:00:00.000Z",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it("renews a token at least 2 minutes old with the cookie as bearer and stores the new one", async () => {
    const old = tokenAged(MIN_RENEW_AGE_MS);
    jar.set(SESSION, { value: old, options: {} });
    fetchMock.mockResolvedValue(
      Response.json({ token: "new-jwt", expiresAt: "2026-11-18T12:30:00Z", sessionEndsAt: "2026-11-18T23:00:00Z", user }),
    );
    const res = await renew(call("renew"));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ renewed: true, expiresAt: "2026-11-18T12:30:00Z", sessionEndsAt: "2026-11-18T23:00:00Z" });
    expect(text).not.toContain("new-jwt");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/admin/auth/renew");
    expect((init!.headers as Record<string, string>).Authorization).toBe(`Bearer ${old}`);
    expect(init!.body).toBeUndefined();
    expect(jar.get(SESSION)).toMatchObject({ value: "new-jwt", options: { maxAge: 1800 } });
  });

  it.each([401, 403])("clears the cookie and answers 401 on a BFF %s", async (status) => {
    jar.set(SESSION, { value: tokenAged(5 * 60_000), options: {} });
    fetchMock.mockResolvedValue(bffError(status, status === 401 ? "UNAUTHENTICATED" : "FORBIDDEN"));
    const res = await renew(call("renew"));
    expect(res.status).toBe(401);
    expect(jar.has(SESSION)).toBe(false);
  });

  it("relays 429 and keeps the cookie", async () => {
    const token = tokenAged(5 * 60_000);
    jar.set(SESSION, { value: token, options: {} });
    fetchMock.mockResolvedValue(bffError(429, "RATE_LIMITED", { "Retry-After": "30" }));
    const res = await renew(call("renew"));
    expect(res.status).toBe(429);
    expect(jar.get(SESSION)?.value).toBe(token);
  });
});

describe("GET /api/admin/auth/session", () => {
  it("answers the cookie's times, calls nothing and sets no cookie", async () => {
    jar.set(SESSION, { value: tokenAged(10 * 60_000), options: {} });
    const res = await session(call("session", { method: "GET" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ expiresAt: "2026-11-18T12:20:00.000Z", sessionEndsAt: "2026-11-18T23:00:00.000Z" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.set).not.toHaveBeenCalled();
  });

  it.each([
    ["no cookie", undefined],
    ["an expired token", tokenAged(30 * 60_000)],
    ["garbage", "not-a-jwt"],
  ])("answers 401 for %s", async (_label, token) => {
    if (token) jar.set(SESSION, { value: token, options: {} });
    const res = await session(call("session", { method: "GET" }));
    expect(res.status).toBe(401);
    expect(store.set).not.toHaveBeenCalled();
  });
});

describe("POST /api/admin/auth/logout", () => {
  it("clears both cookies and calls nothing", async () => {
    jar.set(SESSION, { value: "jwt", options: {} });
    jar.set(CHALLENGE, { value: "c", options: {} });
    const res = await logout(call("logout"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(jar.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
