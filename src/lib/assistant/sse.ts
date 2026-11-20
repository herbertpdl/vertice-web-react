/**
 * A minimal Server-Sent Events parser (the subset the BFF sends: `event:`, `data:`, comment
 * heartbeats). Pure and incremental: `push` takes text in any chunking, `end` flushes an event the
 * stream closed without a blank line after.
 */
export interface SseMessage {
  event: string;
  data: string;
}

export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = "";
  let event = "";
  let data: string[] = [];

  function dispatch() {
    if (data.length > 0 || event !== "") onMessage({ event: event || "message", data: data.join("\n") });
    event = "";
    data = [];
  }

  function line(text: string) {
    if (text === "") {
      dispatch();
      return;
    }
    if (text.startsWith(":")) return; // comment: the BFF's heartbeat
    const colon = text.indexOf(":");
    const field = colon < 0 ? text : text.slice(0, colon);
    let value = colon < 0 ? "" : text.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    // `id` and `retry` are not used.
  }

  return {
    push(chunk: string) {
      buffer += chunk;
      let index: number;
      while ((index = buffer.search(/\r\n|\r|\n/)) >= 0) {
        // A lone "\r" at the very end may be the first half of "\r\n": wait for the next chunk.
        if (buffer[index] === "\r" && index === buffer.length - 1) break;
        const newline = buffer.startsWith("\r\n", index) ? 2 : 1;
        line(buffer.slice(0, index));
        buffer = buffer.slice(index + newline);
      }
    },
    end() {
      if (buffer !== "") {
        line(buffer.replace(/\r$/, ""));
        buffer = "";
      }
      dispatch();
    },
  };
}

/** Reads `body` to the end, calling `onMessage` per event. Rejects when the stream errors (an abort included). */
export async function readSse(
  body: ReadableStream<Uint8Array>,
  onMessage: (message: SseMessage) => void,
): Promise<void> {
  const parser = createSseParser(onMessage);
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
  } finally {
    reader.releaseLock();
  }
}
