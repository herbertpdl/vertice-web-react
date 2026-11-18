import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const incoming = new Headers();
vi.mock("next/headers", () => ({ headers: async () => incoming }));

import { resetServerEnvForTests } from "./env.server";
import { fetchMeOnServer, SERVER_ME_TIMEOUT_MS } from "./serverMe";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  fetchMock.mockReset();
  incoming.delete("x-forwarded-for");
});

describe("fetchMeOnServer (admin-panel spec W4)", () => {
  it("asks GET /auth/me with the token and the browser's address, uncached", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    incoming.set("x-forwarded-for", "6.6.6.6, 203.0.113.7");
    fetchMock.mockResolvedValue(Response.json({ id: 1, role: "ADMIN" }));
    expect(await fetchMeOnServer("jwt")).toEqual({ kind: "ok", me: { id: 1, role: "ADMIN" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/auth/me");
    expect(init).toMatchObject({
      cache: "no-store",
      headers: { Authorization: "Bearer jwt", "X-Forwarded-For": "203.0.113.7" },
    });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [500, "unavailable"],
    [503, "unavailable"],
  ])("reads %s as %s", async (status, kind) => {
    fetchMock.mockResolvedValue(Response.json({ error: { code: "X", message: "x" } }, { status }));
    expect(await fetchMeOnServer("jwt")).toEqual({ kind });
  });

  it("never throws: a network error or a broken body is unavailable", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    expect(await fetchMeOnServer("jwt")).toEqual({ kind: "unavailable" });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    expect(await fetchMeOnServer("jwt")).toEqual({ kind: "unavailable" });
  });

  it("gives up after SERVER_ME_TIMEOUT_MS: a stalled BFF is unavailable, not a blank page", async () => {
    fetchMock.mockImplementationOnce(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init!.signal!.addEventListener("abort", () => reject(init!.signal!.reason));
        }),
    );
    const started = Date.now();
    expect(await fetchMeOnServer("jwt")).toEqual({ kind: "unavailable" });
    expect(Date.now() - started).toBeGreaterThanOrEqual(SERVER_ME_TIMEOUT_MS - 50);
    expect(fetchMock.mock.calls[0][1]!.signal).toBeInstanceOf(AbortSignal);
  });

  it("is unavailable in production without TRUSTED_PROXY_HOPS rather than guessing an address", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "");
    expect(await fetchMeOnServer("jwt")).toEqual({ kind: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
