import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({
  setSession: vi.fn(),
  clearSession: vi.fn(),
  getSessionToken: vi.fn(),
}));

import { clearSession, setSession } from "@/lib/session";
import { POST as login } from "./login/route";
import { POST as logout } from "./logout/route";
import { POST as setup } from "./password/setup/route";
import { POST as register } from "./register/route";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

// www's own handlers answer 404 on the admin host (admin-panel spec W3): a trainer posting to
// `/api/auth/login` there gets no `vertice_session` cookie on that host.
describe("www auth handlers on the admin host", () => {
  const ADMIN = "admin.localhost:5173";

  it.each([
    ["login", login, { email: "ana@example.com", password: "x" }],
    ["register", register, {}],
    ["password/setup", setup, { token: "t", newPassword: "abcdefgh1" }],
    ["logout", logout, undefined],
  ] as const)("/api/auth/%s is a 404 with no BFF call and no cookie", async (name, handler, body) => {
    const res = await handler(
      new NextRequest(`http://${ADMIN}/api/auth/${name}`, {
        method: "POST",
        headers: {
          Host: ADMIN,
          Origin: `http://${ADMIN}`,
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(setSession).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });
});
