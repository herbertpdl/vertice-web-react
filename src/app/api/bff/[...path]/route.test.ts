import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ getSessionToken: vi.fn(async () => "jwt") }));

import { getSessionToken } from "@/lib/session";

import { DELETE, GET, PATCH, POST } from "./route";
import { resetServerEnvForTests } from "@/lib/env.server";

const fetchMock = vi.fn<typeof fetch>();

// What a browser sends on a fetch from this app's own pages (see src/lib/requestGuard.ts).
const SAME_ORIGIN = { Origin: "http://web.test", "Sec-Fetch-Site": "same-origin" };

function call(
  handler: typeof GET,
  path: string[],
  init: { method: string; headers?: Record<string, string>; body?: BodyInit },
) {
  const request = new NextRequest(`http://web.test/api/bff/${path.join("/")}`, {
    ...init,
    headers: { ...SAME_ORIGIN, ...init.headers },
  });
  return handler(request, { params: Promise.resolve({ path }) });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerEnvForTests();
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

  describe("path encoding", () => {
    it("percent-encodes each segment and keeps the query string", async () => {
      fetchMock.mockResolvedValue(Response.json([]));
      const request = new NextRequest("http://web.test/api/bff/exercises/x?search=supino%20reto", {
        method: "GET",
        headers: SAME_ORIGIN,
      });
      await GET(request, { params: Promise.resolve({ path: ["exercises", "a b?c#d%e"] }) });
      expect(fetchMock.mock.calls[0][0]).toBe(
        "http://localhost:3000/api/exercises/a%20b%3Fc%23d%25e?search=supino%20reto",
      );
    });

    it.each([
      ["a `..` segment", ["..", "health"]],
      ["a `.` segment", ["clients", ".", "4"]],
      ["an empty segment", ["clients", "", "4"]],
      ["`..%2Fhealth`, which Next hands over decoded", ["../health"]],
      ["a double-encoded `..%252Fhealth`", ["..%2Fhealth"]],
      ["a double-encoded `%2e%2e`", ["%2e%2e", "health"]],
      ["a backslash", ["clients\\..\\health"]],
      ["an encoded backslash", ["clients%5C4"]],
    ])("rejects %s with 400 before calling the BFF", async (_label, path) => {
      const res = await call(GET, path, { method: "GET" });
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("401 propagation", () => {
    it("answers 401 UNAUTHENTICATED without a session, before calling the BFF", async () => {
      vi.mocked(getSessionToken).mockResolvedValueOnce(undefined);
      const res = await call(GET, ["clients"], { method: "GET" });
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("UNAUTHENTICATED");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("relays the BFF's 401 (expired token) as-is, so the client logs out", async () => {
      fetchMock.mockResolvedValue(
        Response.json({ error: { code: "UNAUTHORIZED", message: "Token expired" } }, { status: 401 }),
      );
      const res = await call(GET, ["auth", "me"], { method: "GET" });
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("UNAUTHORIZED");
    });
  });

  it("relays a non-JSON upstream body with its status and Content-Type", async () => {
    fetchMock.mockResolvedValue(
      new Response("<html>502 Bad Gateway</html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
    );
    const res = await call(GET, ["clients"], { method: "GET" });
    expect(res.status).toBe(502);
    expect(res.headers.get("Content-Type")).toBe("text/html");
    expect(await res.text()).toBe("<html>502 Bad Gateway</html>");
  });

  describe("CSRF and body type", () => {
    it("forwards a same-origin JSON body as JSON", async () => {
      fetchMock.mockResolvedValue(Response.json({ id: 4 }));
      const res = await call(PATCH, ["clients", "4"], {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ana" }),
      });
      expect(res.status).toBe(200);
      const init = fetchMock.mock.calls[0][1]!;
      expect(init.body).toBe('{"name":"Ana"}');
      expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });

    it.each([
      ["a cross-site POST", "POST", { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }],
      ["a same-site POST (sibling subdomain)", "POST", { Origin: "https://x.web.test", "Sec-Fetch-Site": "same-site" }],
      ["a cross-site DELETE", "DELETE", { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }],
      ["a cross-site GET", "GET", { "Sec-Fetch-Site": "cross-site" }],
    ])("refuses %s with 403 before calling the BFF", async (_label, method, headers) => {
      const request = new NextRequest("http://web.test/api/bff/clients", { method, headers });
      const res = await POST(request, { params: Promise.resolve({ path: ["clients"] }) });
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a POST with no Origin with 403", async () => {
      const request = new NextRequest("http://web.test/api/bff/clients", { method: "POST" });
      const res = await POST(request, { params: Promise.resolve({ path: ["clients"] }) });
      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a text/plain body with 415", async () => {
      const res = await call(POST, ["clients"], {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: '{"name":"Ana"}',
      });
      expect(res.status).toBe(415);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("refuses a body with no Content-Type with 415", async () => {
      const res = await call(POST, ["clients"], { method: "POST", body: new Blob(['{"name":"Ana"}']) });
      expect(res.status).toBe(415);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("allows a body-less POST with no Content-Type", async () => {
      fetchMock.mockResolvedValue(Response.json({ token: "setup" }));
      const res = await call(POST, ["clients", "4", "setup-token"], { method: "POST" });
      expect(res.status).toBe(200);
    });
  });

  describe("caching", () => {
    function expectNoStore(res: Response) {
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("Vary")).toBe("Cookie");
    }

    it("marks a relayed response no-store and Vary: Cookie, whatever the BFF sent", async () => {
      fetchMock.mockResolvedValue(
        Response.json(
          { id: 4, cpf: "529.982.247-25" },
          { headers: { "Cache-Control": "public, max-age=600" } },
        ),
      );
      const request = new NextRequest("http://web.test/api/bff/clients/4?reveal=cpf", {
        method: "GET",
        headers: SAME_ORIGIN,
      });
      const res = await GET(request, { params: Promise.resolve({ path: ["clients", "4"] }) });
      expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/api/clients/4?reveal=cpf");
      expectNoStore(res);
    });

    it("marks a relayed error and a 204 no-store", async () => {
      fetchMock.mockResolvedValueOnce(
        Response.json({ error: { code: "NOT_FOUND", message: "Resource not found" } }, { status: 404 }),
      );
      expectNoStore(await call(GET, ["clients", "4"], { method: "GET" }));
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
      expectNoStore(await call(DELETE, ["clients", "4"], { method: "DELETE" }));
    });

    it("marks the proxy's own refusals no-store", async () => {
      vi.mocked(getSessionToken).mockResolvedValueOnce(undefined);
      expectNoStore(await call(GET, ["clients"], { method: "GET" }));
      expectNoStore(await call(GET, ["..", "health"], { method: "GET" }));
      const crossSite = new NextRequest("http://web.test/api/bff/clients", {
        method: "GET",
        headers: { "Sec-Fetch-Site": "cross-site" },
      });
      expectNoStore(await GET(crossSite, { params: Promise.resolve({ path: ["clients"] }) }));
    });
  });
});
