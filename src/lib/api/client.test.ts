import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();
const location = { href: "/perfil" };

// client.ts keeps a module-level "already logging out" flag: a fresh module per test.
async function loadClient() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  location.href = "/perfil";
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { location });
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function htmlError(status: number) {
  return new Response("<html>Bad Gateway</html>", {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

/** The call that went to the web's logout route, if any. */
function logoutCall() {
  return fetchMock.mock.calls.find(([url]) => url === "/api/auth/logout");
}

describe("apiClient errors", () => {
  it("turns a non-JSON error body into an UNKNOWN_ERROR ApiError with the status", async () => {
    const { apiClient, ApiError } = await loadClient();
    fetchMock.mockResolvedValue(htmlError(502));
    const error = await apiClient.get("/clients").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "UNKNOWN_ERROR", status: 502 });
    expect(logoutCall()).toBeUndefined();
  });

  it("still logs out on a 401 whose body isn't JSON", async () => {
    const { apiClient } = await loadClient();
    fetchMock.mockImplementation(async (url) =>
      url === "/api/auth/logout" ? Response.json({ ok: true }) : htmlError(401),
    );
    await expect(apiClient.get("/clients")).rejects.toMatchObject({
      code: "UNKNOWN_ERROR",
      status: 401,
    });
    expect(logoutCall()?.[1]).toMatchObject({ method: "POST" });
    await vi.waitFor(() => expect(location.href).toBe("/login"));
  });
});

describe("apiClient.download", () => {
  it("logs out and goes to /login on a 401", async () => {
    const { apiClient } = await loadClient();
    fetchMock.mockImplementation(async (url) =>
      url === "/api/auth/logout"
        ? Response.json({ ok: true })
        : Response.json({ error: { code: "UNAUTHENTICATED", message: "Not signed in" } }, { status: 401 }),
    );
    await expect(apiClient.download("/auth/me/export", "x.json")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/bff/auth/me/export");
    expect(logoutCall()?.[1]).toMatchObject({ method: "POST" });
    await vi.waitFor(() => expect(location.href).toBe("/login"));
  });

  it("does not log out on another error", async () => {
    const { apiClient } = await loadClient();
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "TOO_LARGE", message: "Too large" } }, { status: 413 }),
    );
    await expect(apiClient.download("/auth/me/export", "x.json")).rejects.toMatchObject({
      code: "TOO_LARGE",
    });
    expect(logoutCall()).toBeUndefined();
    expect(location.href).toBe("/perfil");
  });
});
