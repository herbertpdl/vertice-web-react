import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/session", () => ({ getSessionToken: vi.fn(async () => "jwt") }));

import { getSessionToken } from "@/lib/session";
import { resetServerEnvForTests } from "@/lib/env.server";
import { POST } from "./route";

const fetchMock = vi.fn<typeof fetch>();
const SAME_ORIGIN = {
  Origin: "http://web.test",
  "Sec-Fetch-Site": "same-origin",
  "Content-Type": "application/json",
};

function call(init: { headers?: Record<string, string>; body?: string; signal?: AbortSignal } = {}) {
  return POST(
    new NextRequest("http://web.test/api/assistant/workout-chat", {
      method: "POST",
      headers: { ...SAME_ORIGIN, ...init.headers },
      body: init.body ?? JSON.stringify({ message: "oi" }),
      signal: init.signal,
    }),
  );
}

function sseResponse(chunks: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  resetServerEnvForTests();
  fetchMock.mockReset();
  vi.mocked(getSessionToken).mockClear();
});

describe("POST /api/assistant/workout-chat", () => {
  it("forwards the body with the session token and streams the answer through unbuffered", async () => {
    fetchMock.mockResolvedValue(sseResponse(["event: text\ndata: {\"text\":\"Ol", "á\"}\n\n"]));
    const res = await call({ body: '{"message":"oi"}' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3000/api/assistant/workout-chat");
    expect(init!.method).toBe("POST");
    expect(init!.body).toBe('{"message":"oi"}');
    const headers = init!.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer jwt");
    expect(headers.Accept).toBe("text/event-stream");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe("no-store, no-transform");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    expect(await res.text()).toBe('event: text\ndata: {"text":"Olá"}\n\n');
  });

  it("passes an abort signal upstream that fires when the browser request is aborted", async () => {
    fetchMock.mockResolvedValue(sseResponse([]));
    const controller = new AbortController();
    await call({ signal: controller.signal });
    const signal = fetchMock.mock.calls[0][1]!.signal!;
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal.aborted).toBe(false);
    controller.abort();
    expect(signal.aborted).toBe(true);
  });

  it("relays a refusal before the stream (the BFF's flag off: 503 AI_UNAVAILABLE) as JSON, no-store", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { code: "AI_UNAVAILABLE", message: "off" } }, { status: 503 }),
    );
    const res = await call();
    expect(res.status).toBe(503);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ error: { code: "AI_UNAVAILABLE", message: "off" } });
  });

  it("answers 401 without a session", async () => {
    vi.mocked(getSessionToken).mockResolvedValueOnce(undefined);
    const res = await call();
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a cross-site request with 403", async () => {
    const res = await call({ headers: { Origin: "https://evil.test", "Sec-Fetch-Site": "cross-site" } });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-JSON body with 415", async () => {
    const res = await call({ headers: { "Content-Type": "text/plain" } });
    expect(res.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a 404 on the admin host", async () => {
    const res = await POST(
      new NextRequest("http://admin.localhost:5173/api/assistant/workout-chat", {
        method: "POST",
        headers: {
          Host: "admin.localhost:5173",
          Origin: "http://admin.localhost:5173",
          "Sec-Fetch-Site": "same-origin",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
