import { ApiError } from "@/lib/api/client";
import type { StreamWorkoutChat } from "@/lib/api/assistant";
import {
  ASSISTANT_MESSAGE_MAX,
  HISTORY_MAX_CHARS,
  HISTORY_MAX_TURNS,
  NO_PROGRESS_TIMEOUT_MS,
  type AssistantErrorCode,
  type AssistantEvent,
  type HistoryTurn,
  type ProposalExercise,
  type WorkoutChatRequest,
} from "./contract";
import {
  READY_MESSAGE,
  SAVE_FIRST_MESSAGE,
  STOPPED_MESSAGE,
  assistantErrorMessage,
  assistantErrorMessages,
  stageLabel,
} from "./copy";

/**
 * The assistant's chat (spec "Chat store", assessment F6): a plain store owned by one editor mount,
 * unit-tested without React or HTTP. Unlike the autosave engine it dies with the editor:
 * `dispose()` on unmount aborts the message, which is what stops it on every way out of the page
 * (R5, R50).
 *
 * - `idle`: nothing in flight.
 * - `saving`: R53's flush before sending; the editor is locked.
 * - `waiting`: sent, nothing back yet; still locked (a change may be coming, R23).
 * - `answering`: text is arriving (or a proposal arrived); the editor is usable (R20).
 * - `building`: a stage arrived; the editor stays locked under the overlay (R19).
 */
export type ChatPhase = "idle" | "saving" | "waiting" | "answering" | "building";

export interface StageItem {
  key: string;
  label: string;
  done: boolean;
}

export type ChatMessage =
  | { id: string; turn: string; role: "user"; kind: "text"; text: string }
  | { id: string; turn: string; role: "assistant"; kind: "text" | "ready"; text: string }
  /** A `text` event's own line (client-anamnese D11): what was left out (AI-R51), a conflict with the anamnese (R30). */
  | { id: string; turn: string; role: "assistant"; kind: "left_out" | "conflict"; text: string }
  | { id: string; turn: string; role: "assistant"; kind: "stages"; stages: StageItem[] }
  | {
      id: string;
      turn: string;
      role: "assistant";
      kind: "error" | "stopped" | "notice";
      text: string;
      /** "Tentar novamente" resends this turn's message (R22). */
      retryable?: boolean;
    };

export interface ChatState {
  messages: ChatMessage[];
  phase: ChatPhase;
  /** The composer's text. Kept in the store so a refused send can give it back (R53, E29). */
  input: string;
  /** Turns whose message was answered (text or proposal); only those go into `history`. */
  answered: ReadonlySet<string>;
}

export interface ChatDeps {
  /**
   * R53: lock, then complete any pending save. Resolves `false` when the last save had failed or
   * this one fails; nothing is sent then.
   */
  prepare(): Promise<boolean>;
  /** The workout on screen (keyed, F5), read after `prepare` so a just-created workout has its id. */
  buildRequest(): Omit<WorkoutChatRequest, "history" | "message">;
  /**
   * A proposal arrived: the editor shows it in review (R25). Throwing rejects it (R32). A returned
   * string is a notice shown under the ready line (edits the proposal replaced).
   */
  onProposal(exercises: ProposalExercise[]): string | void;
  stream: StreamWorkoutChat;
  timeoutMs?: number;
}

export function isBusy(state: ChatState): boolean {
  return state.phase !== "idle";
}

/** R19 / R53: the editor is read-only while saving before the send, waiting, or building. */
export function locksEditor(state: ChatState): boolean {
  return state.phase === "saving" || state.phase === "waiting" || state.phase === "building";
}

/** UTF-16 units, the way the BFF counts them (`utf16String`). */
export function messageLength(text: string): number {
  return text.length;
}

export function canSend(state: ChatState): boolean {
  const text = state.input.trim();
  return state.phase === "idle" && text !== "" && messageLength(state.input) <= ASSISTANT_MESSAGE_MAX;
}

/** R56: the newest turns that fit both caps, oldest dropped first, in order. */
export function trimHistory(
  turns: HistoryTurn[],
  maxTurns = HISTORY_MAX_TURNS,
  maxChars = HISTORY_MAX_CHARS,
): HistoryTurn[] {
  const kept: HistoryTurn[] = [];
  let chars = 0;
  for (let i = turns.length - 1; i >= 0 && kept.length < maxTurns; i--) {
    chars += turns[i].text.length;
    if (chars > maxChars) break;
    kept.unshift(turns[i]);
  }
  return kept;
}

export function historyOf(state: ChatState): HistoryTurn[] {
  const turns: HistoryTurn[] = [];
  for (const m of state.messages) {
    if (!state.answered.has(m.turn)) continue;
    if (m.role === "user") turns.push({ role: "user", text: m.text });
    else if (m.kind === "text" || m.kind === "ready" || m.kind === "left_out" || m.kind === "conflict") {
      turns.push({ role: "assistant", text: m.text });
    }
  }
  return trimHistory(turns);
}

function errorCodeOf(error: unknown): AssistantErrorCode | string {
  if (error instanceof ApiError) return error.code;
  return "AI_ERROR";
}

/** Copy for a failure before or during the stream: the assistant codes' own, else a generic one. */
function failureText(error: unknown): string {
  const code = errorCodeOf(error);
  if (Object.hasOwn(assistantErrorMessages, code)) return assistantErrorMessage(code);
  if (error instanceof ApiError && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")) {
    return "Este treino não está mais disponível para o assistente.";
  }
  if (error instanceof ApiError && error.code === "RATE_LIMITED") {
    return "Muitas mensagens em pouco tempo. Aguarde um instante e tente novamente.";
  }
  return assistantErrorMessage("AI_ERROR");
}

interface RunHandle {
  controller: AbortController;
  turn: string;
  /** The assistant text message the next `text` event appends to. */
  textId: string | null;
  stagesId: string | null;
  finished: boolean;
}

export interface ChatStore {
  getState(): ChatState;
  subscribe(listener: () => void): () => void;
  setInput(text: string): void;
  send(): Promise<void>;
  /** "Parar" (R16). */
  stop(): void;
  /** "Tentar novamente" on the last error (R22). */
  retry(): Promise<void>;
  /** Unmount: abort whatever is in flight, silently. */
  dispose(): void;
}

export function createChatStore(deps: ChatDeps): ChatStore {
  const timeoutMs = deps.timeoutMs ?? NO_PROGRESS_TIMEOUT_MS;
  let state: ChatState = { messages: [], phase: "idle", input: "", answered: new Set() };
  const listeners = new Set<() => void>();
  // The slot: only the run stored here may change the state. A stopped, timed-out or superseded
  // run's late events and settlement find another handle (or none) and are ignored.
  let current: RunHandle | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  const nextId = (prefix: string) => `${prefix}${++seq}`;

  function setState(patch: Partial<ChatState>) {
    state = { ...state, ...patch };
    for (const listener of listeners) listener();
  }

  function push(message: ChatMessage) {
    setState({ messages: [...state.messages, message] });
  }

  function update(id: string, fn: (m: ChatMessage) => ChatMessage) {
    setState({ messages: state.messages.map((m) => (m.id === id ? fn(m) : m)) });
  }

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function armTimer(handle: RunHandle) {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      if (current !== handle) return;
      end(handle, { kind: "error", text: assistantErrorMessage("AI_TIMEOUT"), retryable: true });
    }, timeoutMs);
  }

  function markAnswered(turn: string) {
    if (state.answered.has(turn)) return;
    setState({ answered: new Set([...state.answered, turn]) });
  }

  function closeStages(handle: RunHandle) {
    if (!handle.stagesId) return;
    update(handle.stagesId, (m) =>
      m.kind === "stages" ? { ...m, stages: m.stages.map((s) => ({ ...s, done: true })) } : m,
    );
  }

  /** Ends `handle`'s run: frees the slot, aborts the request, adds the closing line if any. */
  function end(
    handle: RunHandle,
    closing: { kind: "error" | "stopped"; text: string; retryable?: boolean } | null,
  ) {
    if (current !== handle) return;
    current = null;
    handle.finished = true;
    clearTimer();
    handle.controller.abort();
    if (closing) push({ id: nextId("m"), turn: handle.turn, role: "assistant", ...closing });
    setState({ phase: "idle" });
  }

  function onEvent(handle: RunHandle, event: AssistantEvent) {
    if (current !== handle) return;
    switch (event.type) {
      case "text": {
        armTimer(handle);
        if (event.line) {
          // A whole line of its own (R31, E25): never merged into the answer, and text after it
          // starts a new bubble.
          push({
            id: nextId("m"),
            turn: handle.turn,
            role: "assistant",
            kind: event.line === "anamnese_conflict" ? "conflict" : "left_out",
            text: event.text,
          });
          handle.textId = null;
        } else if (handle.textId === null) {
          handle.textId = nextId("m");
          push({ id: handle.textId, turn: handle.turn, role: "assistant", kind: "text", text: event.text });
        } else {
          update(handle.textId, (m) => (m.kind === "text" ? { ...m, text: m.text + event.text } : m));
        }
        if (state.phase !== "answering") setState({ phase: "answering" });
        return;
      }
      case "stage": {
        armTimer(handle);
        const item: StageItem = {
          key: event.stage,
          label: stageLabel(event.stage, event.exercise),
          done: false,
        };
        if (handle.stagesId === null) {
          handle.stagesId = nextId("m");
          push({ id: handle.stagesId, turn: handle.turn, role: "assistant", kind: "stages", stages: [item] });
        } else {
          update(handle.stagesId, (m) => {
            if (m.kind !== "stages") return m;
            const last = m.stages[m.stages.length - 1];
            // `building_sets` repeats once per exercise: one row, its label updated in place.
            if (last && last.key === item.key && !last.done) {
              if (last.label === item.label) return m;
              return { ...m, stages: [...m.stages.slice(0, -1), item] };
            }
            return { ...m, stages: [...m.stages.map((s) => ({ ...s, done: true })), item] };
          });
        }
        // Text after the stages (R51's line) starts its own bubble below them.
        handle.textId = null;
        if (state.phase !== "building") setState({ phase: "building" });
        return;
      }
      case "proposal": {
        armTimer(handle);
        let notice: string | void;
        try {
          notice = deps.onProposal(event.exercises);
        } catch {
          end(handle, { kind: "error", text: assistantErrorMessage("AI_INVALID_PROPOSAL"), retryable: true });
          return;
        }
        closeStages(handle);
        push({ id: nextId("m"), turn: handle.turn, role: "assistant", kind: "ready", text: READY_MESSAGE });
        if (notice) push({ id: nextId("m"), turn: handle.turn, role: "assistant", kind: "notice", text: notice });
        markAnswered(handle.turn);
        // R51's "left out" line arrives as text after this: a new bubble under the ready line.
        handle.textId = null;
        setState({ phase: "answering" });
        return;
      }
      case "done": {
        closeStages(handle);
        markAnswered(handle.turn);
        end(handle, null);
        return;
      }
      case "error": {
        if (event.code === "AI_SUPERSEDED") {
          end(handle, { kind: "stopped", text: STOPPED_MESSAGE });
          return;
        }
        end(handle, { kind: "error", text: assistantErrorMessage(event.code), retryable: true });
        return;
      }
    }
  }

  async function run(text: string, turn: string, addedBubble: boolean) {
    // Supersede (BFF F10's client half): a new run takes the slot; nothing is ever running here
    // when `send`/`retry` call this, since both refuse outside `idle`.
    const handle: RunHandle = {
      controller: new AbortController(),
      turn,
      textId: null,
      stagesId: null,
      finished: false,
    };
    current = handle;
    setState({ phase: "saving" });

    let ready = false;
    try {
      ready = await deps.prepare();
    } catch {
      ready = false;
    }
    if (current !== handle) return;
    if (!ready) {
      // E29 / E29a: nothing is sent, the message goes back to the composer.
      current = null;
      const messages = addedBubble ? state.messages.filter((m) => m.turn !== turn) : state.messages;
      setState({
        messages: [
          ...messages,
          { id: nextId("m"), turn, role: "assistant", kind: "notice", text: SAVE_FIRST_MESSAGE },
        ],
        input: state.input.trim() === "" ? text : state.input,
        phase: "idle",
      });
      return;
    }

    let request: WorkoutChatRequest;
    try {
      request = { ...deps.buildRequest(), history: historyOf(state), message: text };
    } catch {
      end(handle, { kind: "error", text: assistantErrorMessage("AI_ERROR"), retryable: true });
      return;
    }
    setState({ phase: "waiting" });
    armTimer(handle); // R53: R21's timer starts with the send.

    try {
      await deps.stream(request, {
        signal: handle.controller.signal,
        onEvent: (event) => onEvent(handle, event),
      });
      // Closed without `done` or `error`: the answer is incomplete.
      if (!handle.finished) {
        end(handle, { kind: "error", text: assistantErrorMessage("AI_ERROR"), retryable: true });
      }
    } catch (error) {
      // An abort we caused (stop, timeout, an error event, dispose) already ended the run.
      if (current !== handle) return;
      end(handle, { kind: "error", text: failureText(error), retryable: true });
    }
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setInput(text) {
      if (text !== state.input) setState({ input: text });
    },
    async send() {
      if (!canSend(state)) return;
      const text = state.input.trim();
      const turn = nextId("t");
      setState({
        input: "",
        messages: [...state.messages, { id: nextId("m"), turn, role: "user", kind: "text", text }],
      });
      await run(text, turn, true);
    },
    stop() {
      if (current) end(current, { kind: "stopped", text: STOPPED_MESSAGE });
    },
    async retry() {
      if (state.phase !== "idle") return;
      const last = state.messages[state.messages.length - 1];
      if (!last || last.role !== "assistant" || last.kind !== "error" || !last.retryable) return;
      const user = state.messages.find((m) => m.role === "user" && m.turn === last.turn);
      if (!user || user.role !== "user") return;
      // Same message again (R22): keep the one bubble, drop what the failed attempt showed.
      setState({
        messages: state.messages.filter((m) => m.turn !== last.turn || m.role === "user"),
      });
      await run(user.text, user.turn, false);
    },
    dispose() {
      // Not one-way: React's dev StrictMode runs an effect's cleanup and then the effect again on
      // the same store, which must still work. A real unmount drops the store with the component.
      clearTimer();
      const handle = current;
      current = null;
      handle?.controller.abort();
      if (handle) setState({ phase: "idle" });
    },
  };
}
