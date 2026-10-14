import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();

// What a browser sends on a fetch from this app's own pages (see src/lib/requestGuard.ts).
const SAME_ORIGIN = { Origin: "http://web.test", "Sec-Fetch-Site": "same-origin" };

function post(body: unknown) {
  return new NextRequest("http://web.test/api/auth/password/setup", {
    method: "POST",
    headers: { ...SAME_ORIGIN, "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("POST /api/auth/password/setup", () => {
  it("posts the token and new password to the BFF and returns its 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await POST(post({ token: "tok", newPassword: "senha-forte-123", confirm: "x" }));

    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/auth/password/setup");
    expect(JSON.parse(init!.body as string)).toEqual({ token: "tok", newPassword: "senha-forte-123" });
    expect((init!.headers as Record<string, string>)["X-Forwarded-For"]).toBe("203.0.113.7");
  });

  it("relays INVALID_SETUP_TOKEN", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "INVALID_SETUP_TOKEN", message: "Invalid or expired setup token" } },
        { status: 400 },
      ),
    );
    const res = await POST(post({ token: "used", newPassword: "senha-forte-123" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_SETUP_TOKEN");
  });

  it("relays 429 with Retry-After", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429, headers: { "Retry-After": "900" } },
      ),
    );
    const res = await POST(post({ token: "tok", newPassword: "senha-forte-123" }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("900");
  });

  it.each([
    ["a missing token", { newPassword: "senha-forte-123" }],
    ["an empty token", { token: "", newPassword: "senha-forte-123" }],
    ["a short password", { token: "tok", newPassword: "curta" }],
    ["a blank password", { token: "tok", newPassword: "          " }],
    ["a password over 72 bytes", { token: "tok", newPassword: "é".repeat(37) }],
  ])("rejects %s with 400 before calling the BFF", async (_, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a cross-origin request with 403 before calling the BFF", async () => {
    const res = await POST(
      new NextRequest("http://web.test/api/auth/password/setup", {
        method: "POST",
        headers: {
          Origin: "https://evil.example",
          "Sec-Fetch-Site": "cross-site",
          "Content-Type": "text/plain",
        },
        body: JSON.stringify({ token: "tok", newPassword: "senha-forte-123" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body that isn't JSON with 415 before calling the BFF", async () => {
    const res = await POST(
      new NextRequest("http://web.test/api/auth/password/setup", {
        method: "POST",
        headers: { ...SAME_ORIGIN, "Content-Type": "application/x-www-form-urlencoded" },
        body: "token=tok",
      }),
    );
    expect(res.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
