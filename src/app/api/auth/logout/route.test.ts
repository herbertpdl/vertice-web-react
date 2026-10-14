import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ clearSession: vi.fn() }));

import { clearSession } from "@/lib/session";
import { POST } from "./route";

function post(headers: Record<string, string>) {
  return new NextRequest("http://web.test/api/auth/logout", { method: "POST", headers });
}

afterEach(() => {
  vi.mocked(clearSession).mockReset();
});

describe("POST /api/auth/logout", () => {
  it("clears the session for a same-origin request (no body needed)", async () => {
    const res = await POST(post({ Origin: "http://web.test", "Sec-Fetch-Site": "same-origin" }));
    expect(res.status).toBe(200);
    expect(clearSession).toHaveBeenCalledOnce();
  });

  it("refuses a cross-site logout with 403 and keeps the session", async () => {
    const res = await POST(post({ Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(clearSession).not.toHaveBeenCalled();
  });
});
