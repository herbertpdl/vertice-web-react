import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ getSessionToken: vi.fn(async () => "jwt") }));

import { DELETE, GET, POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();

function call(
  handler: typeof GET,
  path: string[],
  init: { method: string; headers?: Record<string, string>; body?: string },
) {
  const request = new NextRequest(`http://web.test/api/bff/${path.join("/")}`, init);
  return handler(request, { params: Promise.resolve({ path }) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  fetchMock.mockReset();
});

describe("/api/bff/[...path] proxy", () => {
  it("forwards the client address and the session token", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    fetchMock.mockResolvedValue(Response.json([]));
    await call(GET, ["clients"], {
      method: "GET",
      headers: { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/clients");
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt");
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("refuses to proxy in production without TRUSTED_PROXY_HOPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    await expect(call(GET, ["clients"], { method: "GET" })).rejects.toThrow(
      /TRUSTED_PROXY_HOPS/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays a 204 with no body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await call(DELETE, ["exercises", "1"], { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("relays 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "30" } },
      ),
    );
    const res = await call(POST, ["clients", "4", "setup-token"], { method: "POST" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("30");
  });
});
