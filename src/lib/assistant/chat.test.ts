import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { StreamOptions } from "@/lib/api/assistant";
import { createChatStore, historyOf, locksEditor, trimHistory, type ChatDeps } from "./chat";
import type { AssistantEvent, WorkoutChatRequest } from "./contract";
import { READY_MESSAGE, SAVE_FIRST_MESSAGE, STOPPED_MESSAGE, assistantErrorMessages } from "./copy";

/** A stream the test drives: `emit` events, then `close` or `fail`; an abort rejects it. */
function fakeStream() {
  const calls: { body: WorkoutChatRequest; options: StreamOptions; close: () => void; fail: (e: unknown) => void }[] =
    [];
  const stream = vi.fn(
    (body: WorkoutChatRequest, options: StreamOptions) =>
      new Promise<void>((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        calls.push({ body, options, close: resolve, fail: reject });
      }),
  );
  const last = () => calls[calls.length - 1];
  return {
    stream,
    calls,
    emit: (...events: AssistantEvent[]) => events.forEach((e) => last().options.onEvent(e)),
    close: () => last().close(),
    fail: (e: unknown) => last().fail(e),
    signal: () => last().options.signal,
  };
}

function setup(overrides: Partial<ChatDeps> = {}) {
  const fake = fakeStream();
  const onProposal = vi.fn();
  const prepare = vi.fn(async () => true);
  const store = createChatStore({
    prepare,
    buildRequest: () => ({ trainingPlanId: 7, workoutId: 3, workout: { exercises: [] } }),
    onProposal,
    stream: fake.stream,
    ...overrides,
  });
  return { store, fake, onProposal, prepare };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
});
afterEach(() => {
  vi.useRealTimers();
});

const flushAll = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

describe("chat store", () => {
  it("streams a question's answer, unlocking the editor on the first text (R17, R20, R53)", async () => {
    const { store, fake, prepare } = setup();
    store.setInput("  Quantas séries?  ");
    void store.send();
    expect(store.getState().phase).toBe("saving");
    expect(locksEditor(store.getState())).toBe(true);
    expect(store.getState().input).toBe("");
    await flushAll();
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(store.getState().phase).toBe("waiting");
    expect(locksEditor(store.getState())).toBe(true);
    expect(fake.calls[0].body).toEqual({
      trainingPlanId: 7,
      workoutId: 3,
      workout: { exercises: [] },
      history: [],
      message: "Quantas séries?",
    });

    fake.emit({ type: "text", text: "Faça " });
    expect(store.getState().phase).toBe("answering");
    expect(locksEditor(store.getState())).toBe(false);
    fake.emit({ type: "text", text: "3." }, { type: "done" });
    expect(store.getState().phase).toBe("idle");
    const texts = store.getState().messages.map((m) => ("text" in m ? m.text : m.kind));
    expect(texts).toEqual(["Quantas séries?", "Faça 3."]);
    expect(fake.signal().aborted).toBe(true); // the slot is freed and the request closed
  });

  it("keeps the editor locked through stages, then shows the proposal ready line (R19, R26)", async () => {
    const { store, fake, onProposal } = setup();
    void store.setInput("Adicione um finalizador");
    void store.send();
    await flushAll();
    fake.emit({ type: "stage", stage: "analyzing" });
    expect(store.getState().phase).toBe("building");
    expect(locksEditor(store.getState())).toBe(true);
    fake.emit(
      { type: "stage", stage: "analyzing" },
      { type: "stage", stage: "building_sets", exercise: 1 },
      { type: "stage", stage: "building_sets", exercise: 2 },
    );
    const stages = store.getState().messages.find((m) => m.kind === "stages");
    expect(stages && "stages" in stages && stages.stages).toEqual([
      { key: "analyzing", label: "Analisando o treino", done: true },
      { key: "building_sets", label: "Montando séries do 2º exercício", done: false },
    ]);

    fake.emit({ type: "proposal", exercises: [] });
    expect(onProposal).toHaveBeenCalledWith([]);
    expect(locksEditor(store.getState())).toBe(false);
    // R51: the "left out" line is its own bubble after the fixed ready line.
    fake.emit({ type: "text", text: "Não há kettlebell no catálogo." }, { type: "done" });
    const tail = store.getState().messages.slice(-2).map((m) => ("text" in m ? m.text : ""));
    expect(tail).toEqual([READY_MESSAGE, "Não há kettlebell no catálogo."]);
    expect(store.getState().phase).toBe("idle");
  });

  it("shows the left-out and conflict lines as two separate messages after the proposal (E25, R31)", async () => {
    const { store, fake } = setup();
    store.setInput("Adicione box jump e burpee com salto");
    void store.send();
    await flushAll();
    fake.emit(
      { type: "stage", stage: "analyzing" },
      { type: "proposal", exercises: [] },
      { type: "text", text: "Não encontrei “Burpee com salto”.", line: "left_out" },
      { type: "text", text: "A anamnese diz “evitar impacto”.", line: "anamnese_conflict" },
      { type: "done" },
    );
    const tail = store.getState().messages.slice(-3).map((m) => m.kind + ":" + ("text" in m ? m.text : ""));
    expect(tail).toEqual([
      `ready:${READY_MESSAGE}`,
      "left_out:Não encontrei “Burpee com salto”.",
      "conflict:A anamnese diz “evitar impacto”.",
    ]);
    // Both lines are assistant turns in the next message's history.
    expect(historyOf(store.getState()).slice(-3).map((t) => t.text)).toEqual([
      READY_MESSAGE,
      "Não encontrei “Burpee com salto”.",
      "A anamnese diz “evitar impacto”.",
    ]);
  });

  it("puts a conflict after a text answer on its own line, never appended to the answer (R31, Q6)", async () => {
    const { store, fake } = setup();
    store.setInput("Um bom aquecimento?");
    void store.send();
    await flushAll();
    fake.emit(
      { type: "text", text: "Comece com " },
      { type: "text", text: "mobilidade." },
      { type: "text", text: "Conflita com a anamnese.", line: "anamnese_conflict" },
      { type: "text", text: "Mais texto." },
      { type: "done" },
    );
    const kinds = store
      .getState()
      .messages.filter((m) => m.role === "assistant")
      .map((m) => m.kind + ":" + ("text" in m ? m.text : ""));
    expect(kinds).toEqual(["text:Comece com mobilidade.", "conflict:Conflita com a anamnese.", "text:Mais texto."]);
  });

  it("shows the editor's notice under the ready line", async () => {
    const { store, fake } = setup({ onProposal: () => "edições substituídas" });
    store.setInput("mude");
    void store.send();
    await flushAll();
    fake.emit({ type: "proposal", exercises: [] });
    const tail = store.getState().messages.slice(-2).map((m) => m.kind + ":" + ("text" in m ? m.text : ""));
    expect(tail).toEqual([`ready:${READY_MESSAGE}`, "notice:edições substituídas"]);
  });

  it("refuses to send while a message is in flight or over 2,000 characters (R10, R14)", async () => {
    const { store, fake } = setup();
    store.setInput("a".repeat(2001));
    await store.send();
    expect(fake.stream).not.toHaveBeenCalled();
    store.setInput("primeira");
    void store.send();
    await flushAll();
    store.setInput("segunda");
    await store.send();
    expect(fake.stream).toHaveBeenCalledTimes(1);
  });

  it("does not send after a failed save; the message goes back to the composer (R53, E29a)", async () => {
    const { store, fake } = setup({ prepare: async () => false });
    store.setInput("Troque o supino");
    await store.send();
    expect(fake.stream).not.toHaveBeenCalled();
    const state = store.getState();
    expect(state.phase).toBe("idle");
    expect(state.input).toBe("Troque o supino");
    expect(state.messages.map((m) => m.kind)).toEqual(["notice"]);
    expect("text" in state.messages[0] && state.messages[0].text).toBe(SAVE_FIRST_MESSAGE);
  });

  it("stops: the request is aborted and late events are ignored (R16)", async () => {
    const { store, fake, onProposal } = setup();
    store.setInput("Monte um treino");
    void store.send();
    await flushAll();
    fake.emit({ type: "stage", stage: "analyzing" });
    const signal = fake.signal();
    store.stop();
    expect(signal.aborted).toBe(true);
    expect(store.getState().phase).toBe("idle");
    expect(locksEditor(store.getState())).toBe(false);
    fake.calls[0].options.onEvent({ type: "proposal", exercises: [] });
    expect(onProposal).not.toHaveBeenCalled();
    await flushAll();
    const last = store.getState().messages.at(-1)!;
    expect("text" in last && last.text).toBe(STOPPED_MESSAGE);
  });

  it("times out after 60 s with no stage or text, offering a retry that resends the same message (R21, R22)", async () => {
    const { store, fake } = setup();
    store.setInput("Pergunta");
    void store.send();
    await flushAll();
    await vi.advanceTimersByTimeAsync(59_000);
    fake.emit({ type: "stage", stage: "analyzing" }); // progress resets the timer
    await vi.advanceTimersByTimeAsync(59_000);
    expect(store.getState().phase).toBe("building");
    await vi.advanceTimersByTimeAsync(1_000);
    expect(store.getState().phase).toBe("idle");
    const error = store.getState().messages.at(-1)!;
    expect(error.kind).toBe("error");
    expect("text" in error && error.text).toBe(assistantErrorMessages.AI_TIMEOUT);

    void store.retry();
    await flushAll();
    expect(fake.calls).toHaveLength(2);
    expect(fake.calls[1].body.message).toBe("Pergunta");
    // One bubble for the message, the failed attempt's stages and error gone.
    expect(store.getState().messages.map((m) => m.role + ":" + m.kind)).toEqual(["user:text"]);
  });

  it("shows each error event's copy, a superseded stream as stopped, and an unfinished stream as an error", async () => {
    const { store, fake } = setup();
    store.setInput("um");
    void store.send();
    await flushAll();
    fake.emit({ type: "error", code: "AI_INVALID_PROPOSAL", message: "" });
    expect("text" in store.getState().messages.at(-1)! && store.getState().messages.at(-1)!.kind).toBe("error");

    store.setInput("dois");
    void store.send();
    await flushAll();
    fake.emit({ type: "error", code: "AI_SUPERSEDED", message: "" });
    expect(store.getState().messages.at(-1)!.kind).toBe("stopped");

    store.setInput("três");
    void store.send();
    await flushAll();
    fake.emit({ type: "text", text: "parcial" });
    fake.close();
    await flushAll();
    const last = store.getState().messages.at(-1)!;
    expect(last.kind).toBe("error");
    expect("text" in last && last.text).toBe(assistantErrorMessages.AI_ERROR);
  });

  it("maps a refusal before the stream by its code", async () => {
    const { store, fake } = setup();
    store.setInput("oi");
    void store.send();
    await flushAll();
    fake.fail(new ApiError({ code: "AI_UNAVAILABLE", message: "off" }, 503));
    await flushAll();
    const last = store.getState().messages.at(-1)!;
    expect("text" in last && last.text).toBe(assistantErrorMessages.AI_UNAVAILABLE);
  });

  it("rejects a proposal the editor can't show as an invalid one (R32)", async () => {
    const { store, fake } = setup({
      onProposal: () => {
        throw new Error("over the caps");
      },
    });
    store.setInput("25 exercícios");
    void store.send();
    await flushAll();
    fake.emit({ type: "proposal", exercises: [] });
    const last = store.getState().messages.at(-1)!;
    expect("text" in last && last.text).toBe(assistantErrorMessages.AI_INVALID_PROPOSAL);
    expect(fake.signal().aborted).toBe(true);
  });

  it("sends only answered turns as history", async () => {
    const { store, fake } = setup();
    store.setInput("primeira");
    void store.send();
    await flushAll();
    fake.emit({ type: "text", text: "resposta" }, { type: "done" });
    store.setInput("parada");
    void store.send();
    await flushAll();
    store.stop();
    await flushAll();
    store.setInput("terceira");
    void store.send();
    await flushAll();
    expect(fake.calls[2].body.history).toEqual([
      { role: "user", text: "primeira" },
      { role: "assistant", text: "resposta" },
    ]);
    expect(historyOf(store.getState())).toHaveLength(2);
  });

  it("aborts on dispose (leaving the editor, R5, R50)", async () => {
    const { store, fake } = setup();
    store.setInput("oi");
    void store.send();
    await flushAll();
    store.dispose();
    expect(fake.signal().aborted).toBe(true);
    expect(store.getState().phase).toBe("idle");
    fake.calls[0].options.onEvent({ type: "text", text: "tarde demais" });
    await flushAll();
    expect(store.getState().messages.map((m) => m.kind)).toEqual(["text"]);
  });

  it("drops a send whose save finished after a stop", async () => {
    let release!: (ok: boolean) => void;
    const { store, fake } = setup({ prepare: () => new Promise<boolean>((r) => (release = r)) });
    store.setInput("oi");
    void store.send();
    store.stop();
    release(true);
    await flushAll();
    expect(fake.stream).not.toHaveBeenCalled();
    expect(store.getState().phase).toBe("idle");
  });
});

describe("trimHistory (R56, E32)", () => {
  const turn = (i: number, size = 1) => ({ role: "user" as const, text: String(i).padEnd(size, "x") });

  it("keeps the last 20 turns", () => {
    const turns = Array.from({ length: 25 }, (_, i) => turn(i));
    expect(trimHistory(turns).map((t) => t.text)).toEqual(turns.slice(5).map((t) => t.text));
  });

  it("keeps at most 40,000 characters, dropping the oldest first", () => {
    const turns = [turn(1, 15_000), turn(2, 15_000), turn(3, 15_000)];
    expect(trimHistory(turns)).toEqual(turns.slice(1));
  });
});
