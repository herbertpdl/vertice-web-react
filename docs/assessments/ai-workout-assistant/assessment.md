# Technical assessment (Web): AI Workout Assistant

Status: Draft
Owner: hebertpdl@gmail.com
Related: [PRD](../../prds/ai-workout-assistant/prd.md) (source; `R1`–`R50`, `E1`–`E27`; the editor
rules it amends are `WE-R#` in [the editor PRD](../../prds/create-workout-with-exercises/prd.md)),
[editor spec](../../specs/create-workout-with-exercises/spec.md) (the autosave engine this changes),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/ai-workout-assistant/assessment.md)
(the streamed endpoint this calls, `POST /api/assistant/workout-chat`)
Spec: not yet written (will be `docs/specs/ai-workout-assistant/spec.md`)

## 1. Summary

Overall risk: **High**.

**Design gate:** the PRD's header still says `Design: pending`. The frames for every state the
PRD introduces are already drafted in pen.dev (section `kswLu`, listed in §9) and are waiting
for the owner's review. Implementation can't start until the owner sets `design-ok`. No new
frames were drafted for this assessment, because the existing set covers every state below.

**What it touches:** everything happens inside the workout editor
(`src/components/domain/WorkoutEditor/WorkoutEditor.tsx`). The work:
- a new chat panel with a streaming client;
- a "review" mode laid over the editor's autosave engine;
- change markers computed between the proposal and the last saved workout;
- leave warnings for the review and busy states;
- the first streamed response through the web's BFF proxy.

**Top risks:**
- The proxy buffers the whole response, which defeats R17/R18 (F3).
- The autosave engine has no way to pause (F4).
- A proposal has no stable link to the on-screen exercises, which the "Alterado" marker needs
  (F5).

| Id | Severity | One line |
|---|---|---|
| F1 | Blocker | `Design: pending`: the frames in `kswLu` await the owner's approval |
| F2 | Blocker | The BFF endpoint and `vertice-ai` don't exist yet |
| F3 | High | `/api/bff/[...path]` buffers the response (`relayBffResponse` uses `await res.text()`) and never forwards an abort, so nothing streams and "Parar" can't stop the upstream |
| F4 | High | The autosave engine has no pause or snapshot; review mode (R34, R39, R43) needs both |
| F5 | High | "Alterado" vs "Novo + Removido" (R33) needs proposal entries linked to on-screen exercises; the contract has no such link yet |
| F6 | High | The chat is a state machine (idle, streaming text, building, review, error, stopped) crossing the editor's own states; it needs a tested pure module, not ad-hoc component state |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1 | existing route | Already trainer-only for the whole web (`src/lib/auth/trainerOnly.ts`) |
| R2 | `WorkoutEditor.tsx` | Both `/treinos/novo` and `/treinos/[workoutId]` render the same editor |
| R3 | new: `src/components/domain/AiAssistant/AiAssistantButton` | In the header's actions, where "Recolher todos" and "+ Adicionar exercício" sit today (frames `RTfqu`, `t1PsT`) |
| R4, R5 | new: `AiChatPanel` + chat state (F6) | The conversation lives in the editor's state, not TanStack Query; it's gone on unmount |
| R6 | not applicable to the web | Nothing about it is stored |
| R7–R9, R23, R24 | not applicable to the web | Model behavior |
| R10 | new: composer | Count UTF-16 units like the existing bounds (`src/lib/validation/bounds.ts`); the counter appears near the limit, and sending is blocked above it (frame `Cz6l0`) |
| R11 | new: composer | Fixed disclaimer |
| R12, R13 | new: chat client | Sends the BFF F8 body: `{ trainingPlanId, workoutId?, workout: { exercises }, history, message }`. `exercises` is a keyed variant of `toEntries` (`src/lib/workoutEditor/model.ts:128` drops `key`; add `toKeyedEntries`, F5). `history` is trimmed to the BFF's caps (F9). Never the client's name; the BFF adds the plan context |
| R14, R15 | chat state + composer | Input locked; "Parar" replaces "Enviar" (`Q9EzR`, `ChSlt`) |
| R16 | chat client | `AbortController`; needs F3 so the abort reaches the BFF |
| R17, R18 | chat client | Stream reader; needs F3 |
| R19, R20 | `WorkoutEditor.tsx` | A read-only overlay over the exercises during a change only (`ChSlt`). The header's AI button and "Concluir" stay usable (R49) |
| R21, R22 | chat state | A client-side 60-second no-progress timer as a fallback to the BFF's `AI_TIMEOUT`; "Tentar novamente" resends the last message (`H0aLE`) |
| R25, R26 | chat state + editor | A `proposal` event enters review mode; the chat shows a fixed one-line text (BFF Q3) |
| R27, R28 | editor reducer | A proposal replaces `draft.exercises` only; name and weekday stay |
| R29–R31 | not applicable to the web | Enforced by the BFF; the web only renders the AI's text |
| R32 | chat state | The `AI_INVALID_PROPOSAL` error event (`y8qFL`) |
| R33 | new: `src/lib/workoutEditor/proposalDiff.ts` | Markers against the last saved workout (F5); card and set markers (`A3UUNe`) |
| R34, R35, R43 | autosave engine | Pause during review (F4) |
| R36, R37 | chat client | A new message sends the on-screen proposal as `workout`; a new proposal replaces the old one |
| R38 | autosave engine | "Aplicar" resumes saving and flushes the current draft |
| R39 | autosave engine | "Descartar" restores the last saved snapshot (F4) |
| R40 | autosave engine | First save of a new workout, unchanged (`autosave.ts` nested create) |
| R41 | autosave engine | Existing 409 → per-item path and refusal banner (`SuUX7`); several protected items each stay (PRD §8 default) |
| R42, R50 | `WorkoutEditor.tsx` | Extend `warnOnLeave` (`:197`) and the link guard (`:212`); in-app dialogs (`zfzAk`, `Pu46U`) |
| R44 | new: review banner | "Aplicar" / "Descartar" (`HkumZ`) |
| R45 | footer status | Review status text (PRD §8 default; `A3UUNe` footer) |
| R46 | `WorkoutEditor.tsx` | Same guards as R42 and R50 |
| R47–R49 | chat state + `WorkoutEditor.tsx` | Closing the panel doesn't abort; the AI button shows "IA trabalhando…" (`rLKpQ`) |
| E1–E3, E9–E13 | chat panel | Text or error states (`V8b5f`, `mTIH0`, `F3IREj`, `Cz6l0`, `y8qFL`) |
| E4–E8 | chat state | As R14–R22 |
| E14–E15b | chat client + F4/F5 | |
| E16 | autosave engine | Existing refusal path |
| E17, E26, E27 | `WorkoutEditor.tsx` | Leave guards (F7) |
| E18, E19, E24, E25 | chat state | |
| E20, E21 | autosave engine | Nested create on apply; nothing is created on discard |
| E22 | autosave engine | Last write wins, unchanged (WE-E19) |
| E23 | not applicable to the web | The mobile app shows a normal workout |

## 3. Current state

**The editor** is `WorkoutEditor.tsx` (583 lines), with a local draft (`model.ts`,
`reducer.ts`) and a debounced autosave engine. Engine facts relevant here:
- **Saving:** `autosave.ts` is a plain store, never torn down on unmount. It debounces at 800 ms
  and offers `flush`, `retry`, `finish` and `dispose`. Its status is `idle | saving | saved |
  error`, and its sync mode is `replace | per-item`.
- **Pausing:** it has no way to pause or hold edits: every draft change arms a save.
- **Comparison helpers:** `model.ts` has `toEntries`, `fromFullWorkout`, `sameTree` and
  `sameSetFields`, which a diff can build on, plus `exceedsCaps`.

**Leaving:**
- `beforeunload` while saving or after a failed save (`WorkoutEditor.tsx:194–204`).
- A capture-phase in-app link guard while the last save failed (`:206–`), because "the App Router
  has no route-change event to veto".
- Next 16.4.3's `Link` now has `onNavigate` with `preventDefault()`
  (`node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:453`). It only
  covers `Link`s, though, so the existing capture guard stays the general tool.

**The BFF proxy** (`src/app/api/bff/[...path]/route.ts`):
- reads the request body as text;
- calls `fetch` without passing the request's abort signal;
- answers through `relayBffResponse` (`src/lib/bff.ts:60–73`), which runs `await res.text()`.

So every response is fully buffered, and a closed browser request doesn't cancel the BFF call.

**The API client** (`src/lib/api/client.ts`) answers JSON and logs out on a 401 (`:65–77`).
Nothing in `src/lib/api` streams.

**Types** are generated from vertice-bff's `docs/openapi.json` (`npm run api:types`). The stream's
event payloads must be published there (BFF assessment F8).

## 4. Findings by dimension

### 1. PRD fit and the design gate

**F1 — Blocker — `Design: pending`.**
- **What:** the PRD header reads `Design: pending — frames drafted in pen.dev section …
  (kswLu), awaiting the owner's review`.
- **Where:** `docs/prds/ai-workout-assistant/prd.md:4`.
- **Why it matters:** CLAUDE.md's design gate says no implementation until the owner sets
  `design-ok`.
- **Recommendation:**
  - The owner reviews the frames listed in §9.
  - The two PRD §8 items to settle at that review are the footer text during review, and
    whether "Usar treino existente como base" is hidden during review. The frames show the first
    and don't draw the second.

### 2. Upstream readiness

**F2 — Blocker — The endpoint doesn't exist.**
- **What:** `POST /api/assistant/workout-chat` is only recommended by the BFF assessment, and
  `vertice-ai` has no feature endpoint and isn't deployed (BFF F1).
- **Where:** new: `src/lib/api/assistant.ts`.
- **Why it matters:** the web can be built against a stub stream, but its types come from the
  BFF's OpenAPI, which must contain the event schemas first.
- **Recommendation:** merge order is vertice-ai → vertice-bff (flag off) → web. The web hides
  the AI button while the feature flag is off (BFF Q2).

### 3. Screens and routing

**Info.** No new route. Everything sits inside the existing editor routes. The panel is a
440 px right-hand column inside the editor body (`t1PsT`), so the editor's grid narrows. At
narrow widths, the spec should decide whether the panel overlays the editor instead (Q2).

### 4. Design system and components

**F8 — Medium — New domain components, and a few kit gaps.**
- **What:** the frames introduce parts the kit (`src/components/ui/`) doesn't have:
  - a chat bubble pair;
  - a stages list with done, current and pending icons;
  - an AI-tinted (secondary purple) button and banner;
  - change-marker tags ("Novo", "Alterado", "Removido") on the exercise card;
  - highlighted set cells;
  - a struck-through removed card;
  - a lock overlay scoped to the exercises.
- **Where:**
  - new: `src/components/domain/AiAssistant/` (`AiAssistantButton`, `AiChatPanel`, `ChatMessage`, `StagesCard`, `ReviewBanner`);
  - changed: `WorkoutExerciseCard`, which gains a marker prop and highlighted cells;
  - existing `Spinner` and `Button`.
- **Recommendation:**
  - Build them as domain components with stories.
  - The marker tags reuse the card's existing tag slot, which is the same one the "Arrastando"
    tag uses in the frames (`L0DHq`).
  - Don't add anything to `ui/` unless pen.dev gains a kit component for it, per the CLAUDE.md
    rule that the kit is generated from pen.dev.

### 5. Data fetching and cache

**F3 — High — The proxy can't stream or cancel.**
- **What:**
  - `relayBffResponse` does `await res.text()`, so text and stages would all appear at the end
    (R17, R18). The R21 timers would also fire on long proposals.
  - The proxy's `fetch` doesn't receive `request.signal`, so "Parar" and leaving (R16, R50)
    only close the browser's side while the BFF and `vertice-ai` keep working and spending
    tokens (BFF F6).
- **Where:** `src/app/api/bff/[...path]/route.ts`, `src/lib/bff.ts:60–73`.
- **Recommendation:** add a dedicated route, `src/app/api/assistant/workout-chat/route.ts`,
  rather than changing the generic proxy:
  - Pass `request.signal` to `fetch`.
  - Return `new Response(res.body, …)` with `Content-Type: text/event-stream` and
    `Cache-Control: no-cache`.
  - Start with `guardApiRequest(request, "json")` and send `bffHeaders`, like every route.
  - Keep `relayBffResponse` for everything else.
  - Check that `withNoStore` and the CSP leave the stream alone.
  - The proxy's `request.text()` is fine for the request body.

**F9 — Medium — The streaming client sits outside TanStack Query.**
- **What:** a chat message isn't a query or a cacheable mutation. And `apiClient` can't read a
  stream.
- **Where:** new `src/lib/api/assistant.ts`.
- **Recommendation:**
  - A `fetch` + `ReadableStream` SSE parser as a pure function, unit-tested.
  - Reuse `apiClient`'s 401 behavior: log out and send to `/login`.
  - Map error events through `apiErrorMessage` keyed on `code`.
  - **History:** each message sends the conversation's earlier turns as text only (role and
    text). Earlier proposals don't go into the history: the current proposal is already the
    on-screen `workout` (R36). The chat store trims the history it sends to the BFF's caps
    (BFF Q4: 20 turns, 40,000 characters), dropping the oldest turns first, so a long session
    never gets a 400. The screen still shows the whole conversation (R4).
  - Applying a proposal goes through the existing autosave transport. Nothing new to invalidate
    beyond what the editor's saves already invalidate.

### 6. Client-side state

**F4 — High — The autosave engine needs a review mode.**
- **What:**
  - While a proposal is in review, edits must not save (R34, R43).
  - "Descartar" must restore the last saved workout (R39).
  - "Aplicar" must save the screen's workout (R38).
  - Today every draft change arms a debounced save, and there's no saved-snapshot accessor
    exposed for a restore.
- **Where:** `src/lib/workoutEditor/autosave.ts` and `useWorkoutAutosave.ts`.
- **Recommendation:**
  - Add `hold()` / `release()` to the engine. While held, edits update the draft but arm
    nothing.
  - Expose the last confirmed tree, which the engine already tracks to compute what's dirty.
  - "Descartar" sets the draft back to that tree and releases. "Aplicar" releases and flushes.
  - Test it in `autosave.test.ts`, the same place as the rest of the engine.

**Before a change request:** the PRD has an open point here (the reviewer's note from #83). An
edit that hasn't finished saving, or whose save failed, would be lost on "Descartar". `flush()`
already exists, so making a change request wait on `flush()` is cheap. The spec should take the
owner's decision (Q1).

**F5 — High — Markers need a link from each proposal entry to an on-screen exercise.**
- **What:**
  - R33 marks an exercise as changed ("Alterado"), added ("Novo") or removed ("Removido")
    against the last saved workout.
  - The proposal is a list of `WorkoutExerciseEntry` with no link to the screen's exercises.
  - Two "Supino" entries (allowed, `API-R7`) or a reordered list would make a diff by exercise
    id or position guess wrong.
- **Where:** the BFF ↔ web contract (BFF F8) and new `src/lib/workoutEditor/proposalDiff.ts`.
- **Recommendation:**
  - The web sends each on-screen exercise with an opaque key (the model's `key`, `model.ts:53`),
    through a keyed variant of `toEntries`, which today drops it.
  - Each proposal entry carries back the key of the exercise it modifies, or none when it's new.
    Entries without a key get a fresh `newKey("e")` when they go into the draft, so the next
    chained request (E15) can send them.
  - The BFF checks that the keys are among those sent.
  - The diff then compares fields per key against the saved snapshot: changed sets get
    highlighted, unmatched entries are "Novo", and saved exercises with no entry are "Removido".
  - This must go into the BFF spec's event schema.

**F6 — High — The chat is a state machine.**
- **What:** its states are:
  - idle
  - sending
  - streaming text
  - building with stages
  - review
  - error
  - stopped

  They interact with the panel being open or closed (R47), the editor lock (R19), leave guards
  (R42, R50) and the engine's hold (F4).
- **Where:** new `src/lib/assistant/chat.ts` (a pure reducer plus effects at the edge), used by
  `WorkoutEditor.tsx`.
- **Recommendation:**
  - Model it like the autosave engine: a plain store with unit tests (vitest `unit` project),
    never torn down mid-message by a re-render.
  - Unlike the engine, though, the editor mount owns the store, and unmounting calls `abort()`
    on its `AbortController`. Back/Forward and `router.push` from elsewhere bypass every guard,
    so unmount cleanup is what satisfies R50's "leaving anyway stops the message" on those
    paths. It also gives R5's empty chat on return.

**F7 — Medium — Leave guards for two new states.**
- **What:**
  - R42 (review) and R50 (busy) add in-app warnings with their own text (`zfzAk`, `Pu46U`) and
    the browser prompt on reload or close.
  - Today `warnOnLeave` covers saving and error only (`:197`).
  - The link guard covers a failed save only (`:212`).
  - "Concluir" doesn't guard.
- **Where:** `WorkoutEditor.tsx:194–230` and the "Concluir" handler.
- **Recommendation:**
  - Widen both guards to "busy or in review".
  - Route "Concluir" through the same dialog.
  - Leaving anyway aborts the stream or discards the proposal.
  - The browser's Back/Forward buttons can't be warned. That's the same limit WE-R12 has today,
    and unmount cleanup (F6) stops the message on that path.

### 7. Error handling

**Info.** The new error codes (BFF F11) need entries in `src/lib/api/errorMessages.ts`, keyed by
`ApiErrorCode` as the repo requires. Copy from the frames:
- "Não foi possível responder";
- "Não consegui montar o treino";
- "Interrompido. O treino não foi alterado."

A 409 `CONFLICT` for a message already running (BFF F10) can also happen in a single tab:
- right after "Parar", because the abort takes time to reach the BFF;
- after the web's own 60-second fallback timer, followed by "Tentar novamente".

The chat client retries a `CONFLICT` that arrives before streaming starts, up to twice, with a
short backoff (about 500 ms). Only then does it show a normal error with "Tentar novamente".

### 8. Copy and localization

**Info.** All copy is pt-BR and fixed in the frames:
- the stage labels, which the web maps from the BFF's stage keys rather than showing the
  model's text;
- the disclaimer;
- the banner;
- the dialogs.

Keep the stage map in one file keyed by the contract's stage union, following the
one-label-map-per-concept rule.

### 9. Accessibility

**Low.**
- Streaming text should be announced politely (`aria-live="polite"` on the message list, not per
  chunk).
- The lock overlay must keep focus out of the locked cards.
- Markers can't rely on color alone: the frames already pair each color with a word.

### 10. Testing

See §6.

## 5. Options

The proxy (F3): a dedicated streaming route handler, or making the generic `[...path]` proxy
stream-aware. The dedicated route is recommended. It keeps the generic proxy's buffering, which
preserves `Content-Disposition` and `Retry-After` handling and other behavior unchanged.

## 6. Testing strategy

**`unit` project:**
- the SSE parser: split chunks, several events in one chunk, heartbeats ignored, an error
  event, a truncated stream;
- the chat state machine: history trimming to the caps, retrying a `CONFLICT` before streaming,
  and unmount mid-stream aborting; plus every transition in §4.6, including closing the panel mid-build and
  "Parar" in each state;
- `proposalDiff`: added, removed and changed cards; duplicate exercises; reordering; matching by
  key; comparison against the saved snapshot after chained proposals (E15, E15a);
- the engine's `hold` and `release`: no save while held, discard restores the snapshot, apply
  flushes, nested create on apply for a new workout (E20), nothing created on discard (E21);
- the dedicated route handler: streams the body, forwards abort, and applies
  `guardApiRequest`'s 403 and 415.

**Storybook:** stories for each new domain component and each frame state (empty, streaming,
building, review with markers, each error, over the limit), plus the exercise card's marker
variants.

**Pages:** they have no tests today (CLAUDE.md), and the logic above lives in `src/lib`, so that's
acceptable.

## 7. Effort and risk

**Size: L.** No new route, but the work includes:
- a state machine;
- an engine change in the editor's most delicate code;
- a diff module;
- a streaming client and route;
- about six new domain components.

**Dependencies:**
- owner approval of the design (F1);
- the BFF endpoint, its OpenAPI event schemas and the feature flag (F2);
- the `vertice-ai` feature endpoint and deployment;
- the PRD §8 legal decision before the flag is turned on.

## 8. Questions and assumptions

- **Q1.** Does a change request wait for a pending or failed save first (PRD reviewer note on
  #83)? Assume yes: `await engine.flush()`, and if the save fails, don't send. The chat says the
  workout must be saved first.
- **Q2.** Below which width does the panel overlay the editor instead of sitting beside it? Assume
  below 1280 px it overlays, full height on the right.
- **Q3.** How does the web learn the feature flag (BFF Q2)? Assume a field the web already loads
  (`GET /auth/me`), decided in the BFF spec.

## 9. Inputs to the spec

- F1: wait for `design-ok`, and settle PRD §8's footer and "Usar treino existente como base"
  questions at that review.
- F2: build against a stub stream; merge order vertice-ai → vertice-bff → web; hide the button
  while the flag is off.
- F3: a dedicated streaming route with abort forwarding.
- F4: engine `hold` / `release` and a saved snapshot.
- F5: per-exercise keys in the request and the proposal (contract with the BFF), and
  `proposalDiff`.
- F6: the chat state machine as a tested pure module.
- F7: leave guards for busy and review, through "Concluir" too.
- F8: domain components and the card marker variant.
- F9: the SSE client and error-code copy.

**Frames** (pen.dev `Vertice Web.pen`, section `kswLu`, drafted before this assessment and reused
here; awaiting owner approval):

| Row | Frame | Node id |
|---|---|---|
| 1 | Editor — botão Assistente IA (painel fechado) | `RTfqu` |
| 1 | Editor — painel do assistente aberto (conversa vazia) | `t1PsT` |
| 2 | Pergunta — resposta chegando em tempo real | `Q9EzR` |
| 2 | Alteração — IA montando o treino (editor bloqueado) | `ChSlt` |
| 2 | Alteração — painel fechado, IA ainda trabalhando | `rLKpQ` |
| 3 | Revisão — proposta da IA no editor | `A3UUNe` |
| 4 | Aplicada — remoção recusada | `SuUX7` |
| 4 | Sair com proposta pendente — aviso | `zfzAk` |
| 4 | Sair com a IA trabalhando — aviso | `Pu46U` |
| 5 | Chat states: erro, interrompido, proposta inválida, fora do tema, ambíguo, catálogo/limites, mensagem longa | `H0aLE`, `B5JpUE`, `y8qFL`, `V8b5f`, `mTIH0`, `F3IREj`, `Cz6l0` |
