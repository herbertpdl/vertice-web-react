# Spec: AI Workout Assistant (Web)

PRD: [docs/prds/ai-workout-assistant/prd.md](../../prds/ai-workout-assistant/prd.md) (rules `R#`,
edge cases `E#`). Assessment:
[docs/assessments/ai-workout-assistant/assessment.md](../../assessments/ai-workout-assistant/assessment.md)
(findings `F#`). Editor spec: [create-workout-with-exercises](../create-workout-with-exercises/spec.md).
BFF endpoint: [vertice-bff `docs/api-contract.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
("Assistant"). Design: `Vertice Web.pen`, section `kswLu` (frames listed in the assessment §9).

## Scope

Web only, inside the workout editor. No new page or route. One new route handler
(`/api/assistant/workout-chat`) that streams the BFF's answer.

## Merge and deploy order

`vertice-ai` → `vertice-bff` (`AI_ASSISTANT_ENABLED=false`) → `vertice-web-react`. The web calls
an endpoint the BFF must already serve, and its types come from the BFF's `docs/openapi.json`.
Rollback runs the other way: revert the web first. A web without the BFF endpoint is harmless
because the button stays hidden while the flag is off.

## Switching it on

One switch: the BFF's `AI_ASSISTANT_ENABLED` (off by default). The editor asks
`GET /assistant/status` (`{ enabled }`, through the generic proxy). It shows the AI button only
on `enabled: true`. A failure or an older BFF keeps the button hidden. With the flag off, the BFF
also answers the chat route with 503 `AI_UNAVAILABLE`. The web has no flag of its own, so
merging this to `main` shows trainers nothing.

PRD §7 "Personal data before launch" must be done before the flag goes on.

## Transport

- **`src/app/api/assistant/workout-chat/route.ts`** (F3) runs `hostGuard(request, "trainer")`,
  then `guardApiRequest(request, "json")` and the session token. It forwards the
  body to `${BFF_URL}/api/assistant/workout-chat` with `bffHeaders` and `signal: request.signal`,
  so "Parar" and leaving cancel the BFF call. A `text/event-stream` 2xx is returned as
  `new Response(res.body)` with `Cache-Control: no-store, no-transform` (`no-transform` keeps
  Next's gzip from buffering it) and `X-Accel-Buffering: no`. Anything else goes through
  `relayBffResponse`.
- **`bffAllowList`** refuses `/assistant/workout-chat` on the generic proxy (on both hosts),
  because the proxy buffers. `GET /assistant/status` goes through the proxy from www.
- **`src/lib/assistant/sse.ts`** is a pure SSE parser. It handles split chunks, CRLF, several
  events per chunk, multi-line `data:`, and comment heartbeats. Each event's JSON is parsed and
  shape-checked into an `AssistantEvent`. Anything malformed is dropped.
- **`src/lib/api/assistant.ts`** `streamWorkoutChat(body, { signal, onEvent })`. A non-2xx
  becomes an `ApiError` through `apiClient`'s failure path, so a 401 logs out like any call.

## Contract (aliases over the generated schema)

The request is `{ trainingPlanId, workoutId?, workout: { exercises: KeyedEntry[] }, history,
message }`. `KeyedEntry` is `WorkoutExerciseEntry` plus the editor's opaque `key`
(`toKeyedEntries` in `model.ts`). `history` holds `{ role: "user" | "assistant", text }` turns,
trimmed to the last 20 turns and 40,000 characters, oldest first out (R56, E32). Only answered
turns are sent. Errors, "stopped" lines and proposals are never sent.

The events are:

- `stage { stage }`, where `stage` is one of `analyzing`, `choosing_exercises`, `building_sets`
  or `checking`. The web shows its own label for each, and a generic one for an unknown key.
  `building_sets` repeats once per exercise, with `exercise: n`. It updates the one current row
  ("Montando séries do nº exercício") and adds none.
- `text { delta }`
- `proposal { exercises }`
- `done {}`
- `error { code, message }`

Before the stream starts, the BFF can also answer 413 `AI_CATALOG_TOO_LARGE` or 503
`AI_UNAVAILABLE`. Each proposal entry echoes the `key` of the exercise it changes, or
none when the exercise is new (F5).

## Chat store: `src/lib/assistant/chat.ts` (F6)

A plain store (`subscribe`/`getState`) created by the editor mount through
`useState(() => createChatStore(deps))`. `dispose()` runs on unmount: it aborts the stream, so
leaving by any path stops the message (R5, R50). Its `deps` are `prepare()` (R53's flush),
`buildRequest()`, `onProposal()` and the injected `stream`, so it is unit-tested without React
or HTTP.

The `phase` is one of these:

- `idle`
- `saving`: R53's flush
- `waiting`: sent, nothing back yet
- `answering`: text is arriving
- `building`: a stage arrived

The editor is locked in `saving`, `waiting` and `building` (R19, R53). The first `text` moves
`waiting` to `answering`, which unlocks the editor (R20). A `stage` locks it again. After a
`proposal`, the phase is `answering`, because the proposal is now editable in review.

**Send**
- Only from `idle`, with 1–2,000 UTF-16 units (R10, R14).
- `prepare()` refuses when the last save failed, or when the flush fails. The message then
  goes back into the composer and the chat shows "save first" (E29, E29a).
- **Supersede:** each send owns an `AbortController` slot. Events from a stream that no longer
  owns the slot are ignored.

**Timer.** A 60-second timer resets on every `stage` and `text`. When it fires, it aborts and
shows `AI_TIMEOUT` (R21). Heartbeats don't reset it.

**Endings**
- "Parar" aborts and shows "Interrompido. O treino não foi alterado." (R16).
- `AI_SUPERSEDED` shows the same line.
- An error event, a failed request, or a stream that ends without `done` shows the code's copy
  plus "Tentar novamente".
- "Tentar novamente" resends the same text without adding a second bubble (R22).

## Review mode: the autosave engine (F4)

New engine methods:

- `propose(exercises)`:
  - The first time, it remembers the current (just-flushed, so saved) draft as the review base
    and holds.
  - Each call replaces `draft.exercises`.
  - While held, `dispatch` edits the draft but arms nothing, `flush`/`retry` are no-ops, and
    `state.review` is `{ base }` (R34, R35, R43).
- `applyProposal()` releases and saves at once (R38). A new workout is created as "Novo treino"
  (R40). The per-item path keeps protected items and names them together in the existing
  refusal banner (R41, E16a).
- `discardProposal()` restores the review base and releases. Nothing is created (R39, E21).

`proposalToExercises` (in `src/lib/assistant/proposal.ts`) turns entries into `EditorExercise`s:

- **Echoed key** that names a draft exercise: it keeps that key and id, and its sets keep their
  keys and ids by position.
- **No key, or a repeated key:** it gets a fresh key.

`proposalDiff(base, draft)` (in `src/lib/workoutEditor/proposalDiff.ts`) compares by key against
the review base, which is the last saved workout, also after chained proposals (R33, E15):

- **Exercises:** new or changed, with the changed fields.
- **Sets:** new or changed, with the changed fields.
- **Removed exercises:** listed with their base index.

## UI (`src/components/domain/AiAssistant/`)

- **`AiAssistantButton`** sits in the sticky toolbar, outside the lock. It shows "IA
  trabalhando…" while busy (R47–R49).
- **`AiChatPanel`** is presentational. It renders the messages (`aria-live="polite"`), the stage
  list, the composer (counter from 1,800, blocked above 2,000), the disclaimer (R11), and
  "Enviar" or "Parar".
  - From 1280 px up, it is a 440 px sticky column beside the editor.
  - Below 1280 px, it is fixed over the editor on the right, full height (R55).
  - Closing it keeps the store (R4).
- **`ReviewBanner`** shows "Aplicar" and "Descartar" (R44).
- **`RemovedExerciseCard`**: the struck-through removed card.
- **Markers:** `WorkoutExerciseCard` and `SetRow` take a `marker` ("Novo"/"Alterado") and the
  changed fields to highlight. The markers are never color alone.
- **Lock:** the toolbar fields, the actions and the list get `inert`, under an "IA montando o
  treino…" overlay.

## Editor changes (`WorkoutEditor.tsx`)

- The footer reads "Proposta em revisão — ainda não salva" while held (R45).
- "Usar treino existente como base" is hidden while held (R52).
- **Leave guards:** `beforeunload` and the link guard also cover busy and held (R42, R46, R50).
  The link guard uses `window.confirm` with its own copy.
- **"Concluir"** asks first through `ConfirmDialog` when busy or held. Leaving anyway stops the
  message or discards the proposal, then finishes (E17, E26).

## Tests

- **`unit` project:**
  - `sse.test.ts`
  - `chat.test.ts`: every transition, R53, supersede, the timer, trimming, dispose
  - `proposal.test.ts`, `proposalDiff.test.ts`
  - `autosave.test.ts`: propose, apply and discard
  - the route's `route.test.ts`: streams, abort, flag, 401/403/415
  - `bffAllowList` and `hostGuard` rows
- **Storybook:** each `AiChatPanel` state, `ReviewBanner`, `RemovedExerciseCard`, and the
  marker variants of the card and the set row.
