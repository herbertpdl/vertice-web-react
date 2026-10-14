import { afterEach, describe, expect, it, vi } from "vitest";

const store = { set: vi.fn(), get: vi.fn(), delete: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => store }));

import { resetServerEnvForTests } from "./env.server";
import { clearSession, getSessionToken, setSession } from "./session";

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  store.set.mockReset();
  store.get.mockReset();
  store.delete.mockReset();
});

function cookieOptions() {
  const [name, value, options] = store.set.mock.calls[0];
  expect(name).toBe("vertice_session");
  expect(value).toBe("jwt");
  return options;
}

describe("setSession", () => {
  it("sets an httpOnly, SameSite=Strict, site-wide session cookie", async () => {
    await setSession("jwt", false);
    expect(cookieOptions()).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
    });
  });

  it("is Secure when the server runs with NODE_ENV=production (read at runtime)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    await setSession("jwt", false);
    expect(cookieOptions()).toMatchObject({ secure: true, httpOnly: true, sameSite: "strict" });
  });

  it("is not Secure outside production (http://localhost dev)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await setSession("jwt", false);
    expect(cookieOptions().secure).toBe(false);
  });

  it("persists for 30 days with remember-me, and is a browser-session cookie without", async () => {
    await setSession("jwt", true);
    expect(cookieOptions().maxAge).toBe(60 * 60 * 24 * 30);
    store.set.mockReset();
    await setSession("jwt", false);
    expect(cookieOptions()).not.toHaveProperty("maxAge");
  });
});

describe("getSessionToken / clearSession", () => {
  it("reads and deletes the same cookie", async () => {
    store.get.mockReturnValue({ value: "jwt" });
    expect(await getSessionToken()).toBe("jwt");
    expect(store.get).toHaveBeenCalledWith("vertice_session");
    await clearSession();
    expect(store.delete).toHaveBeenCalledWith("vertice_session");
  });
});
