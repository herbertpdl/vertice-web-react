import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ setSession: vi.fn() }));

import { setSession } from "@/lib/session";
import { POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://web.test/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(Response.json({ token: "jwt", user: { id: 1 } }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
  vi.mocked(setSession).mockReset();
});

describe("POST /api/auth/login", () => {
  it("sends only email and password, and sets the session", async () => {
    const res = await POST(
      post({ email: "ana@example.com", password: "x", remember: false, extra: 1 }),
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({
      email: "ana@example.com",
      password: "x",
    });
    expect(setSession).toHaveBeenCalledWith("jwt", false);
  });

  it("rejects a malformed body with 400 before calling the BFF", async () => {
    const res = await POST(post({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays 401 as-is", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid email or password" } },
        { status: 401 },
      ),
    );
    const res = await POST(post({ email: "ana@example.com", password: "x" }));
    expect(res.status).toBe(401);
    expect((await res.json()).error.message).toBe("Invalid email or password");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("relays 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "120" } },
      ),
    );
    const res = await POST(post({ email: "ana@example.com", password: "x" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("forwards the address Next observed, with no proxy configured", async () => {
    await POST(post({ email: "ana@example.com", password: "x" }, { "X-Forwarded-For": "203.0.113.7" }));
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("behind two proxies, forwards only the client the outer proxy observed", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "2");
    await POST(
      post(
        { email: "ana@example.com", password: "x" },
        { "X-Forwarded-For": "6.6.6.6, 203.0.113.7, 10.0.0.2" },
      ),
    );
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("refuses to call the BFF in production without TRUSTED_PROXY_HOPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    await expect(
      POST(post({ email: "ana@example.com", password: "x" }, { "X-Forwarded-For": "6.6.6.6" })),
    ).rejects.toThrow(/TRUSTED_PROXY_HOPS must be set in production/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the BFF in production with an explicit TRUSTED_PROXY_HOPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    const res = await POST(
      post({ email: "ana@example.com", password: "x" }, { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" }),
    );
    expect(res.status).toBe(200);
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("sends no X-Forwarded-For when the request has no address", async () => {
    await POST(post({ email: "ana@example.com", password: "x" }));
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("X-Forwarded-For");
  });
});
