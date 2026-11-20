import { apiClient, failure, parseJson } from "./client";
import { parseAssistantEvent, type AssistantEvent, type WorkoutChatRequest } from "@/lib/assistant/contract";
import { readSse } from "@/lib/assistant/sse";
import type { AssistantStatus } from "./types";

export const assistantStatusQueryKey = ["assistantStatus"] as const;

/** `GET /assistant/status`: whether the `AI_ASSISTANT_ENABLED` flag is on for this trainer (the AI button's switch). */
export function fetchAssistantStatus(): Promise<AssistantStatus> {
  return apiClient.get<AssistantStatus>("/assistant/status");
}

export interface StreamOptions {
  signal: AbortSignal;
  onEvent: (event: AssistantEvent) => void;
}

export type StreamWorkoutChat = (body: WorkoutChatRequest, options: StreamOptions) => Promise<void>;

/**
 * `POST /assistant/workout-chat` through this app's streaming route (never the buffering
 * `/api/bff` proxy). A refusal before the stream starts (400, 403, 503 `AI_UNAVAILABLE`, ...)
 * rejects with an `ApiError`, and a 401 logs out like every `apiClient` call. Once streaming, each
 * well-formed event goes to `onEvent`; the promise settles when the stream ends, or rejects when
 * it breaks or `signal` aborts it.
 */
export const streamWorkoutChat: StreamWorkoutChat = async (body, { signal, onEvent }) => {
  const res = await fetch("/api/assistant/workout-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw failure(res, parseJson(await res.text()));
  await readSse(res.body, ({ event, data }) => {
    const parsed = parseAssistantEvent(event, data);
    if (parsed) onEvent(parsed);
  });
};
