import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ setSession: vi.fn() }));

import { setSession } from "@/lib/session";
import { POST } from "./route";
import { resetServerEnvForTests } from "@/lib/env.server";

const fetchMock = vi.fn<typeof fetch>();

const validBody = {
  name: "Ana Ribeiro",
  email: "ana@example.com",
  cpf: "529.982.247-25",
  cref: "",
  password: "senha-forte-123",
  remember: true,
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://web.test/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function sentBody() {
  return JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(
    Response.json({ token: "jwt", user: { id: 1, role: "TRAINER" } }, { status: 201 }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  fetchMock.mockReset();
  vi.mocked(setSession).mockReset();
});

describe("POST /api/auth/register", () => {
  it("always registers a TRAINER, whatever role the browser sends", async () => {
    const res = await POST(post({ ...validBody, role: "CLIENT" }));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/api/auth/register");
    expect(sentBody()).toEqual({
      name: "Ana Ribeiro",
      email: "ana@example.com",
      password: "senha-forte-123",
      cpf: "52998224725",
      role: "TRAINER",
    });
    expect(setSession).toHaveBeenCalledWith("jwt", true);
    expect(await res.json()).toEqual({ user: { id: 1, role: "TRAINER" } });
  });

  it("sends only known fields upstream", async () => {
    await POST(post({ ...validBody, cref: "012345-G/SP", isAdmin: true, role: "ADMIN" }));
    expect(Object.keys(sentBody()).sort()).toEqual(
      ["cpf", "cref", "email", "name", "password", "role"].sort(),
    );
    expect(sentBody().role).toBe("TRAINER");
  });

  it.each([
    ["a password under 8 characters", { ...validBody, password: "1234567" }],
    ["an invalid CPF", { ...validBody, cpf: "111.111.111-11" }],
    ["a missing email", { ...validBody, email: undefined }],
  ])("rejects %s with 400 before calling the BFF", async (_, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a body that isn't JSON with 400", async () => {
    const res = await POST(post("not json"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("relays a BFF error with its status and Retry-After, without a session", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "600" } },
      ),
    );
    const res = await POST(post(validBody));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("600");
    expect((await res.json()).error.code).toBe("RATE_LIMITED");
    expect(setSession).not.toHaveBeenCalled();
  });

  it("forwards the client address as X-Forwarded-For", async () => {
    vi.stubEnv("TRUSTED_PROXY_HOPS", "1");
    await POST(post(validBody, { "X-Forwarded-For": "6.6.6.6, 203.0.113.7" }));
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers["X-Forwarded-For"]).toBe("203.0.113.7");
  });
});
