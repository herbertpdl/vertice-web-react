import { describe, expect, it } from "vitest";
import { createSseParser, readSse, type SseMessage } from "./sse";
import { parseAssistantEvent } from "./contract";

function parse(chunks: string[]) {
  const out: SseMessage[] = [];
  const parser = createSseParser((m) => out.push(m));
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  return out;
}

describe("createSseParser", () => {
  it("parses several events in one chunk", () => {
    expect(parse(['event: stage\ndata: {"stage":"analyzing"}\n\nevent: done\ndata: {}\n\n'])).toEqual([
      { event: "stage", data: '{"stage":"analyzing"}' },
      { event: "done", data: "{}" },
    ]);
  });

  it("joins an event split across chunks, mid-line and mid-CRLF", () => {
    expect(parse(["event: te", "xt\r", '\ndata: {"text":', '"a"}\r\n\r', "\n"])).toEqual([
      { event: "text", data: '{"text":"a"}' },
    ]);
  });

  it("ignores comment heartbeats", () => {
    expect(parse([": ping\n\n", "event: done\ndata:\n\n", ":\n\n"])).toEqual([{ event: "done", data: "" }]);
  });

  it("joins multi-line data with newlines", () => {
    expect(parse(["data: a\ndata: b\n\n"])).toEqual([{ event: "message", data: "a\nb" }]);
  });

  it("flushes a last event the stream closed without a blank line", () => {
    expect(parse(['event: error\ndata: {"code":"AI_ERROR"}'])).toEqual([
      { event: "error", data: '{"code":"AI_ERROR"}' },
    ]);
  });
});

describe("readSse", () => {
  it("decodes UTF-8 split across byte chunks", async () => {
    const bytes = new TextEncoder().encode('event: text\ndata: {"text":"séries"}\n\n');
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 27));
        controller.enqueue(bytes.slice(27));
        controller.close();
      },
    });
    const out: SseMessage[] = [];
    await readSse(body, (m) => out.push(m));
    expect(out).toEqual([{ event: "text", data: '{"text":"séries"}' }]);
  });

  it("rejects when the stream errors (a truncated connection)", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("event: text\n"));
        controller.error(new Error("reset"));
      },
    });
    await expect(readSse(body, () => {})).rejects.toThrow("reset");
  });
});

describe("parseAssistantEvent", () => {
  const supino = { id: 1, name: "Supino", description: "", videoUrl: "", muscleGroups: [], isStarter: true };

  it("parses each event type", () => {
    expect(parseAssistantEvent("stage", '{"stage":"analyzing"}')).toEqual({ type: "stage", stage: "analyzing" });
    expect(parseAssistantEvent("text", '{"delta":"Oi"}')).toEqual({ type: "text", text: "Oi" });
    expect(parseAssistantEvent("done", "")).toEqual({ type: "done" });
    expect(parseAssistantEvent("error", '{"code":"AI_TIMEOUT","message":"x"}')).toEqual({
      type: "error",
      code: "AI_TIMEOUT",
      message: "x",
    });
    expect(
      parseAssistantEvent(
        "proposal",
        JSON.stringify({
          exercises: [{ key: "e1", exercise: supino, restSecondsBetweenSets: 60, notes: "", sets: [{ reps: 8 }] }],
        }),
      ),
    ).toEqual({
      type: "proposal",
      exercises: [
        {
          key: "e1",
          exercise: supino,
          restSecondsBetweenSets: 60,
          notes: "",
          sets: [{ reps: 8, strategy: "STRAIGHT" }],
        },
      ],
    });
  });

  it("drops malformed or unknown events, and a whole proposal with one bad entry", () => {
    expect(parseAssistantEvent("text", "{nope")).toBeNull();
    expect(parseAssistantEvent("text", '{"delta":1}')).toBeNull();
    expect(parseAssistantEvent("text", '{"text":"old shape"}')).toBeNull();
    expect(parseAssistantEvent("ping", "{}")).toBeNull();
    expect(
      parseAssistantEvent(
        "proposal",
        JSON.stringify({ exercises: [{ exercise: supino, sets: [{ strategy: "BOGUS" }] }] }),
      ),
    ).toBeNull();
    expect(parseAssistantEvent("proposal", JSON.stringify({ exercises: [{ sets: [] }] }))).toBeNull();
  });

  it("reads an error with no usable payload as AI_ERROR", () => {
    expect(parseAssistantEvent("error", "")).toEqual({ type: "error", code: "AI_ERROR", message: "" });
  });
});
