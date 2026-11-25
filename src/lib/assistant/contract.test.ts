import { describe, expect, it } from "vitest";
import { parseAssistantEvent } from "./contract";

describe("parseAssistantEvent: text lines (client-anamnese D11)", () => {
  it("keeps a known line", () => {
    expect(parseAssistantEvent("text", JSON.stringify({ delta: "x", line: "left_out" }))).toEqual({
      type: "text",
      text: "x",
      line: "left_out",
    });
    expect(parseAssistantEvent("text", JSON.stringify({ delta: "y", line: "anamnese_conflict" }))).toEqual({
      type: "text",
      text: "y",
      line: "anamnese_conflict",
    });
  });
  it("drops an unknown line but keeps its text as answer text", () => {
    expect(parseAssistantEvent("text", JSON.stringify({ delta: "z", line: "something_new" }))).toEqual({
      type: "text",
      text: "z",
    });
  });
  it("answer text has no line", () => {
    expect(parseAssistantEvent("text", JSON.stringify({ delta: "a" }))).toEqual({ type: "text", text: "a" });
    expect(parseAssistantEvent("text", JSON.stringify({ line: "left_out" }))).toBeNull();
  });
});
