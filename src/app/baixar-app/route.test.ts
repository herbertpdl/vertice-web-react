import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/appLinks";

function get(userAgent?: string) {
  return GET(
    new NextRequest("http://web.test/baixar-app", {
      headers: userAgent ? { "User-Agent": userAgent } : {},
    }),
  );
}

describe("GET /baixar-app", () => {
  it("sends an iPhone to the App Store", () => {
    const res = get("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(APP_STORE_URL);
  });

  it("sends an Android phone to Google Play", () => {
    const res = get("Mozilla/5.0 (Linux; Android 15; Pixel 9) Mobile");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(PLAY_STORE_URL);
  });

  it("gives anything else both store links", async () => {
    const res = get("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain(APP_STORE_URL);
    expect(html).toContain(PLAY_STORE_URL);
  });
});
