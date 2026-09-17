# Spec: Create Workout With Exercises (Web) — autosave workout editor

Status: Draft — implementation follows in a separate PR (this document is the contract it is built against)
Owner: hebertpdl@gmail.com
Related: [docs/prds/create-workout-with-exercises/prd.md](../../prds/create-workout-with-exercises/prd.md)
(product rules R1–R29, edge cases E1–E20, decisions §7 — this document does not restate them),
[vertice-bff/docs/specs/create-workout-with-exercises/spec.md](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/create-workout-with-exercises/spec.md)
and [vertice-bff/docs/api-contract.md](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
(the endpoints consumed here: `POST /training-plans/:planId/workouts` with nested `exercises`,
`PUT /workouts/:workoutId/exercises` and 409 `PRECONDITION_FAILED` — **not on vertice-bff `main`
yet**: they land with [vertice-bff#18](https://github.com/herbertpdl/vertice-bff/pull/18), stacked
on [vertice-bff#17](https://github.com/herbertpdl/vertice-bff/pull/17) for the 409 mapping; until
those merge, read both documents on that PR's branch — plus the unchanged per-item endpoints,
already on `main`), [vertice-api/docs/specs/create-workout-with-exercises/spec.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/specs/create-workout-with-exercises/spec.md)
(upstream semantics of the replace: whole tree recreated, refused once *any* recorded data exists),
pen.dev design `Vertice Web.pen`, root frame `Vertice — Editor de treino (salvamento automático)`
(visual source of truth for copy, layout and states).

## 0. Scope decisions

- **Local editor state is the source of truth; the server is synced from it by a debounced,
  coalesced, serialized engine (R7, R8).** `src/lib/workoutEditor/autosave.ts` owns an
  `EditorWorkout` draft (name, weekday, exercises with sets; every item has a stable client
  `key` and a nullable server `id`) plus the last server-confirmed `snapshot`. Any edit updates
  the draft and (re)arms one 800 ms timer; when it fires, one `flush()` runs. If a flush is
  already in flight, the new edit only marks `pendingFlush`, and the in-flight flush chains a
  second one when it finishes — so there is never more than one request sequence in flight per
  workout and edits made mid-save are picked up by the next save (R8, E15). 800 ms (inside the
  requested 600–1000 ms window) is long enough to swallow a burst of keystrokes and short enough
  that "Salvando…" appears before the trainer looks for it. The engine is a plain TypeScript
  store (`subscribe`/`getSnapshot`) with an injectable `now/setTimeout` so it is unit-tested in
  Node with fake timers; React consumes it through `useSyncExternalStore`.
- **Which endpoint each change uses.** Traced to R3–R5 (creation), R7 (everything else):
  - *New workout, first flush* → `POST /training-plans/:planId/workouts` with the full nested
    payload (`name` = typed name, or `"Novo treino"` when blank — R4/E2 — "blank" meaning
    `name.trim() === ""`, so a whitespace-only name does not slip past this check and reach the
    BFF's `min(1)` validator as if it were real content; `dayOfWeek`;
    `exercises` = the draft, order = list position — R17/R18). The response's ids are written
    back into the draft by list position and the URL is switched to
    `/planos/:planId/treinos/:workoutId` with `window.history.replaceState` (Next's router syncs
    with the native History API), so the editor stays mounted and no local state is lost. A
    reload lands on the `[workoutId]` route normally. A new workout with no change never flushes
    (R5/E3).
  - *Existing workout, name/weekday* → `PATCH /workouts/:id` `{name, dayOfWeek}`, debounced
    together with everything else and sent first in the same flush. A blank name (same
    `trim() === ""` check as above) is never sent (the BFF requires `min(1)`): when the flush
    runs and the draft's name is blank, the engine puts the snapshot's name back into the draft
    (the field snaps back to the saved name) before comparing, so screen and server never
    disagree, "Salvo" is honest and `finish()` cannot leave with a blank field. Clearing the name
    is therefore not a way to rename; the trainer types the new name over it (mirrors R4 for a
    new workout, where blank → "Novo treino").
  - *Existing workout, exercise/set tree* → **`PUT /workouts/:id/exercises`** with the whole draft
    (`replace` mode, the default). One request covers adds, edits, removals and reorders; the
    response's all-new ids are written back by position (BFF spec §2.2).
- **409 `PRECONDITION_FAILED` switches the workout to `per-item` mode; the refusal itself is
    reported by the per-item delete that fails (R27, R28, E13, E14).** The engine keys on
    `ApiError.code === "PRECONDITION_FAILED"`, not on the status alone (409 is also `CONFLICT`);
    the code/status pair is the BFF's (`PreconditionFailedError`, BFF spec §0/§3 — vertice-api's
    own REST handler answers 412, but the web never talks to it). Upstream refuses *every*
    replace once any set under the workout has recorded data — not only replaces that would drop
    the recorded set (api spec §0, BFF spec §3). So "revert only the offending change and keep
    saving the rest" cannot be built on the replace endpoint alone: a diff with no removal at all
    is refused too, and the 409 message names the first recorded set, not the one the trainer
    removed. Therefore, on 409 the engine (a) keeps the draft untouched, (b) flips this editor
    session to `per-item` mode, and (c) immediately re-syncs the same diff through the unchanged
    one-at-a-time endpoints (`DELETE`/`POST`/`PATCH` on `workout-exercises` and `exercise-sets`,
    with `order`/`setNumber` = list position for reorders — no unique constraint exists on either
    column, so sequential `PATCH`es cannot collide). `per-item` is a transport detail of the
    engine, not a product mode: the trainer keeps the same autosave, the same footer status and
    the same screen, nothing is announced and there is nothing to choose (R26, R28 — the PRD's
    §7 "refused whole-list save" row and §10.1 item 4 describe what the trainer sees, and that is
    unchanged); it only decides whether a flush is one `PUT` or a sequence of per-item calls.
    In that mode a removal of a non-recorded item
    succeeds (E14) and a removal of a recorded item fails upstream (FK `set_logs → exercise_sets`;
    `DeleteExerciseSet`/`DeleteWorkoutExercise` have no explicit check, so the
    `DataIntegrityViolationException` is unmapped in `GrpcExceptionAdvice` and reaches the BFF as
    a generic gRPC status, which `mapGrpcError` renders as **502 `UPSTREAM_ERROR`**).
    **That failed delete is the refused change:** the
    engine restores the item into the draft at its snapshot position, marks it (danger outline +
    "Remoção desfeita — desempenho registrado por um aluno" tag, per the design) and shows the
    "Remoção não aplicada" banner naming the exercise (and set number) from local state; every
    other operation in the same flush still runs and the status ends in "Salvo" (R27, E13). The
    banner is dismissed with "Fechar" (R28). No 409 banner is shown when the refused replace
    carried no removal (there is nothing to undo — the per-item resync just saves it).
    *Which delete failures count as a refusal.* Only the codes a recorded-data delete actually
    produces: `PRECONDITION_FAILED` (409 — what `vertice-api` will return once the §6 follow-up
    lands) and `UPSTREAM_ERROR` (502 — the FK violation today). A `NOT_FOUND` delete counts as
    done (§3). Everything else — network failure, `UPSTREAM_UNAVAILABLE` (503), 401/403, 400,
    unknown codes — is **not** a refusal: the per-item run stops there, the draft is kept and the
    footer goes to "Erro ao salvar — Tentar novamente" exactly as for any other failure (next
    bullet); because the snapshot is advanced op by op (§3), the retry resumes from the failed
    op. Mapping every non-2xx to the refusal path would show "desempenho registrado" for a
    server outage and then report "Salvo" for a change that never reached the server.
    *Known limitation, recorded as a follow-up for `vertice-api` (§6):* until the delete RPCs
    return `FAILED_PRECONDITION` themselves, a genuine upstream 502 on a delete is
    indistinguishable from the FK refusal and is reported as one; the trainer's remedy is to
    remove the item again. The mode is per editor session (not persisted): after a reload the
    first tree change tries `replace` again, gets the 409 and switches, at the cost of one extra
    request.
- **400 `VALIDATION_ERROR` on a replace/create reverts the rejected batch, not the edits made
    since (E9, R8).** A refused create/replace changed nothing upstream (all-or-nothing), so the
    tree is reset to the snapshot (empty list for a not-yet-created workout) and the banner shows
    the platform's generic message. Reverting only "the offending entry" is impossible because
    upstream's message does not identify it (api spec §0, F10). Name/weekday are kept. Edits the
    trainer made while the rejected request was in flight are *not* part of the rejected batch
    and must not be lost (R8, E15): the engine keeps the list of actions dispatched since `sent`
    (`sinceSent`, cleared on every flush start) and, after the reset, replays them through the
    reducer on top of the snapshot. Actions whose target key no longer exists (an edit to a set of
    an exercise that was in the rejected batch) are dropped by the reducer; whatever survives
    leaves the draft dirty and goes out with the chained flush (`pendingFlush`). A plain
    `draft tree = snapshot tree` would have thrown those edits away and then reported "Salvo"
    because the chained flush saw a clean draft.
- **Any other failure (network, 5xx, 503) leaves the draft on screen, sets the footer to
    "Erro ao salvar — Tentar novamente" and arms `beforeunload` (R9, R10, R12, E16).** "Tentar
    novamente" calls `flush()` again with the *current* draft (R10). No automatic retry: the
    trainer decides.
- **A failed create is reconciled before it is retried, so a lost response cannot create the
    workout twice.** Neither the BFF nor `vertice-api` has an idempotency key on
    `POST /training-plans/:planId/workouts`, and a network failure or gateway 5xx can arrive
    after upstream committed the insert — the workout exists, but `workoutId` is still `null`
    on the web. If `retry()` simply re-ran the `POST`, the plan would end up with two "Treino A"
    (or two "Novo treino"). So the engine records `knownWorkoutIds` — the ids of the plan's
    workouts at mount (`GET /training-plans/:planId/workouts`, one call; the editor is opened
    from the plan page, so it is usually cached) — and, when a create failed with anything other
    than a 4xx (a 4xx means nothing was created), `retry()` first lists the plan's workouts
    again: a workout whose id is not in `knownWorkoutIds` and whose `name`/`dayOfWeek` equal
    what was sent is the one that got created. The engine adopts it (`GET /workouts/:id/full`
    for the ids, then `adoptIds`, snapshot, `replaceState` to the workout URL, all exactly as
    after a successful create) and continues in the existing-workout path (`PATCH`/`PUT`) with
    the *current* draft; if none matches, the create is re-sent. Two extra reads on a rare path;
    the false-match case (another tab of the same trainer created an identically named workout
    on the same weekday in the same plan in between) is same-owner and last-write-wins by E19.
    An idempotency key on the BFF/API would make this lookup unnecessary; noted in §6.
- **Footer status is derived from the engine, nowhere else (R9, R13).** `idle` (never saved,
    nothing pending — "As alterações são salvas automaticamente" with the info icon, as in the
    empty-workout frame), `saving` (from the moment a change is made, through the debounce window
    and the request — "Salvando…"), `saved` ("Salvo"), `error`. Counting the debounce window as
    "saving" is deliberate: it is the only window in which leaving loses something, so it must
    also be the window `beforeunload` warns in (R12, E17, E18).
- **"Concluir" flushes then navigates (R11, E17).** `finish()` cancels the timer, runs a flush
    if the draft is dirty, awaits any in-flight one, and resolves `true` only when the final
    status is not `error`; the editor then invalidates the plan/workout queries and
    `router.push`es to the plan. On `false` it stays, with the footer in the error state.
- **Drag and drop uses native HTML5 DnD, no library (R15, R16, E10, E11).** The design needs a
    handle-initiated drag, a drop placeholder between cards ("Soltar aqui — o exercício passa a
    ser o Nº"), a line indicator between set rows, a "dragging" style on the source and a
    "not allowed" style on other cards while a set is dragged — all expressible with
    `dragstart`/`dragover`/`drop`/`dragend` and a few pieces of local state. Adding `dnd-kit` or
    similar would pull a dependency (and its context providers) for desktop-only reordering the
    product does not need touch support yet; native events also keep the components plain
    functions the React Compiler can memoize. Only the grip handle arms `draggable` on its card
    /row (pointer-down on the handle sets a flag; it is cleared on `dragend`), so text selection
    inside the inputs keeps working. Set drags carry the source exercise key; `dragover` on a
    different exercise rejects the drop (`dropEffect = "none"`) and the row snaps back (E11).
    Reordering dispatches `moveExercise`/`moveSet` on the draft; the autosave engine treats it
    like any other edit (R17, R18).
- **Caps are enforced in the draft reducer and reflected in the UI (R21, R22, E5, E6).**
    `addExercise` is a no-op at 20 and `addSet`/`duplicateSet` at 10; the header shows the
    warning hint + "20 / 20 exercícios" counter and disables "+ Adicionar exercício"; the picker
    shows the warning banner and disables every "Adicionar"; the card disables "+ Adicionar
    série" with the hint. The BFF/API still reject over-cap payloads (400) as a backstop.
- **"Usar treino existente como base" seeds the draft from `GET /workouts/:id/full` (R24, R25,
    E7, E8, E20).** `CloneWorkoutDialog` keeps its picker UI; picking now fetches the source's
    full tree and hands it to the editor, which replaces name, weekday, exercises and sets in the
    draft (new client keys, no server ids) and lets autosave create/replace as usual. The offer is
    shown only while `openedAsNew && exercises.length === 0`, so naming the workout (which creates
    it) keeps it and the first exercise removes it for good. `POST /workouts/:id/clone` and
    `cloneWorkout()` are removed from the web: nothing uses them any more. If the source exceeds a
    cap, the fill is refused and the footer shows the error state with the reason (E8).
- **Query cache.** The editor reads `["workout", id, "full"]` once to initialise the draft
    (`initialData` for the session component); after every successful flush it invalidates
    `["workout", id, "full"]` and `["trainingPlan", planId]`, and after creation also
    `["recentWorkouts"]` (the picker's list). It never writes the cache by hand. Invalidation does
    not feed back into the draft — the session component only reads `initial` at mount — so a
    refetch can never overwrite an edit in progress. `useRedirectOnError` still guards the
    initial load (someone else's / deleted workout → back to the plan).
- **Duplicate-set action.** The design's set row carries a "copy" icon; it is implemented as
    `duplicateSet` (insert a copy right below, subject to the 10-set cap). It is a local edit
    like any other (R7, R22) and needs no new endpoint.
- **Weekday labels** follow the design ("Segunda-feira" …) via a new `DAY_NAMES_LONG` map in
    `src/lib/days.ts` (§1); the plan page keeps its short names.
- **Retired code paths.** "Criar treino", the per-item *workout-exercise/set* `useMutation`s in
    `WorkoutExerciseCard`/`AddExerciseDialog` (`addWorkoutExercise`, the set create/update/delete
    calls), the "Descartar" footer action and the immediate `PATCH` on blur are removed.
    `AddExerciseDialog`'s `createExercise` mutation (the catalog create, R23) stays: it still
    `POST /exercises`, and the created catalog exercise is then handed to `onPick(exercise)`
    like any picked one, so the workout-side add goes through the draft. `src/lib/api/
    workoutExercises.ts` / `exerciseSets.ts` keep their per-item wrappers because the `per-item`
    sync mode uses them.
- **No UI-kit component is edited.** Everything new is composed in `src/components/domain`
    from `Button`, `TextField`, `Dropdown`, `Dialog`, `Spinner` and Tailwind token classes.

## 1. Files

| Path | Role |
|---|---|
| `src/lib/workoutEditor/model.ts` | `EditorWorkout`/`EditorExercise`/`EditorSet` types, `fromFullWorkout`, `toEntries` (nested payload), `newExercise`/`newSet` defaults (R19), caps, key generation |
| `src/lib/workoutEditor/reducer.ts` | Pure `reduce(draft, action)` for every edit (name, weekday, add/remove/move/update/duplicate for exercises and sets, seed) with cap enforcement |
| `src/lib/workoutEditor/autosave.ts` | `createAutosaveEngine(...)`: debounce, coalesce, serialize, create-then-replace, per-item fallback, 409/400 handling, `finish`, `retry`, `dismissRefusal` |
| `src/lib/workoutEditor/autosave.test.ts` | Node/vitest unit tests for the engine (fake transport + fake timers) |
| `src/lib/workoutEditor/useWorkoutAutosave.ts` | `useSyncExternalStore` hook creating one engine per editor session |
| `src/lib/api/workouts.ts` | `createWorkout` now takes `WorkoutCreateInput` (nested `exercises?`) and returns `FullWorkout`; new `replaceWorkoutExercises`; `cloneWorkout` removed |
| `src/lib/api/types.ts` | `WorkoutExerciseEntry`, `ExerciseSetEntry` |
| `src/lib/days.ts` | New `DAY_NAMES_LONG` map ("Segunda-feira" …) next to the existing `DAY_NAMES`/`DAY_ABBR` |
| `src/components/domain/WorkoutEditor.tsx` | Loads plan/student/workout, then renders `WorkoutEditorSession` (draft, header, list, DnD, footer, banners) |
| `src/components/domain/WorkoutExerciseCard.tsx` | Presentational card: handle, order badge, rest, notes, sets table, drag/refusal/cap states |
| `src/components/domain/SetRow.tsx` | Presentational row with per-field commit + drag handle + duplicate/remove |
| `src/components/domain/AddExerciseDialog.tsx` | Picker → `onPick(exercise)`; `atCap` banner and disabled actions |
| `src/components/domain/CloneWorkoutDialog.tsx` | Picker → fetches `/workouts/:id/full` → `onPick(full)` |
| `src/components/domain/EditorFooter.tsx` | Status (`idle`/`saving`/`saved`/`error`) + "Concluir" |
| `src/components/domain/*.stories.tsx`, `storyFixtures.ts`, `storyQuery.tsx` | Storybook states for the card, set row, footer, dialogs and the editor session (fake transport, seeded query cache) |
| `vitest.config.ts` | Second project `unit` (node environment) for `src/lib/**/*.test.ts` |

## 2. Editor model

```ts
interface EditorSet {
  key: string; id: number | null;
  reps?: number; durationSeconds?: number; weight?: string; loadPercentage?: string;
  strategy: SetStrategy; restSeconds?: number; notes?: string;
}
interface EditorExercise {
  key: string; id: number | null; exercise: Exercise;   // catalog entry (name, group, video)
  restSecondsBetweenSets: number; notes: string; sets: EditorSet[];
}
interface EditorWorkout { name: string; dayOfWeek: DayOfWeek; exercises: EditorExercise[] }
```

`toEntries(draft)` maps to the BFF `WorkoutExerciseEntry[]` (no `order`/`setNumber`; list
position is the order). Defaults for new items: exercise `restSecondsBetweenSets: 60, notes: ""`,
set `strategy: "STRAIGHT"` with every other field unset (R19).

## 3. Autosave engine

State exposed to React: `{ workoutId, draft, status, mode, refusal, errorMessage, openedAsNew }`.

```
edit ──▶ draft' ──▶ status = saving, arm timer (800 ms)
timer ──▶ flush():
   in flight?  → pendingFlush = true, return
   clean?      → status = saved | idle, return
   sent = draft; sinceSent = []   (every edit while in flight is appended)
   workoutId null → POST create(nested)        → ids by position → snapshot
   else           → PATCH name/day if changed
                    tree changed & mode=replace → PUT replace   → ids by position → snapshot
                    tree changed & mode=per-item → diff(snapshot, sent) as DELETE/POST/PATCH
   errors: create failed with a non-4xx → status = error; retry() lists the plan's workouts,
                                        adopts a new one matching name/day (ids from
                                        /full) or re-sends the create
           409 on PUT → mode = per-item, pendingFlush = true (re-sync same diff)
           400 on POST/PUT → draft tree = reduce(snapshot tree, sinceSent), banner(generic
                             message); dirty if anything survived
           DELETE in per-item → 404: done; 409 PRECONDITION_FAILED / 502 UPSTREAM_ERROR:
                                restore item, banner(named), continue
           anything else → status = error (draft kept; per-item snapshot already advanced
                           for the ops that succeeded)
   done: pendingFlush ? flush() : status = saved
```

Dirty check = deep-compare of `sent` against `snapshot` (name/day and the tree separately).
After a create/replace the snapshot is **the tree as sent plus the ids/positions the server
assigned by list position** (`adoptIds`), not the server's echo: the API normalises values
(decimal `"60.5"` comes back as `"60.50"`), and comparing against the echo left the draft
"dirty" forever (found in the smoke test). Ids are merged into the *current* draft by key, so
edits made while the request was in flight keep their content and gain the new ids. In
`per-item` mode a `DELETE` answered with 404 counts as done (already gone); the snapshot is
advanced op by op so a retry after a mid-way failure does not repeat completed work.

The engine is never torn down on unmount: React's dev StrictMode mount/cleanup/mount cycle must
not kill it (a first version did, and `dispatch` went dead in the app while the Storybook tests,
which run without StrictMode, stayed green), and a save still pending when the trainer navigates
inside the app should complete.

## 4. UI states (from the design frames)

- Header row: `Nome do treino` (placeholder "Treino A — Superior", 360 px) and `Dia da semana`
  (200 px) top-aligned; actions right-aligned to the field boxes: outline "Usar treino existente
  como base" (only while offered) + primary "+ Adicionar exercício". At cap: warning hint
  "Limite de 20 exercícios por treino atingido. Remova um exercício para adicionar outro.",
  pill "20 / 20 exercícios", disabled button.
- Empty panel (no exercises): dumbbell in a 64 px circle, "Este treino ainda não tem
  exercícios", sub copy, the same actions again.
- Exercise card: grip · order badge · name + group badge + "Ver vídeo" · "Descanso entre séries"
  box · trash; `Notas` field ("Adicione observações para este exercício..."); sets table
  (`# / ESTRATÉGIA / REPS/DURAÇÃO / PESO / %1RM / DESCANSO`), rows with grip, copy, x; empty
  sets box "Nenhuma série ainda — este exercício será salvo sem séries"; outline
  "+ Adicionar série"; at 10 sets: disabled + "Limite de 10 séries por exercício atingido. Remova
  uma série para adicionar outra."
- Dragging an exercise: source card gets the primary outline, surface-hover fill, shadow, primary
  grip and the "Arrastando" tag; the placeholder "Soltar aqui — o exercício passa a ser o Nº"
  renders at the insertion index.
- Dragging a set: source row gets the primary outline/shadow, a dot+line indicator renders at
  the insertion index in the same exercise, the hint "Arraste para reordenar. Séries só podem ser
  reordenadas dentro do próprio exercício — soltar em outro exercício devolve a série ao lugar de
  origem." shows under that exercise's rows, and every other card is dimmed with the tag "Não é
  possível soltar uma série de outro exercício aqui".
- Refused removal: banner "Remoção não aplicada" + body "Um aluno já registrou desempenho em
  {exercício} · Série {n}, então essa série não pode mais ser removida. A remoção foi desfeita e a
  série voltou para a tela. O restante do treino continua sendo salvo automaticamente." (exercise
  variant: "…em {exercício}, então esse exercício não pode mais ser removido. A remoção foi
  desfeita e o exercício voltou para a tela. …") with "Fechar"; the restored card gets the danger
  outline and the restored row the danger outline + lock tag.
- Footer: left status (info "As alterações são salvas automaticamente" / spinner "Salvando…" /
  check "Salvo" / circle-x "Erro ao salvar —" + link "Tentar novamente"); right "Concluir"
  (visually muted while saving — a lower-opacity style only, not `disabled`: the button stays
  clickable so `finish()` can still await the pending save, per E17).
- Picker at cap: warning banner "Este treino já tem 20 exercícios — o máximo permitido" / "Você
  pode continuar navegando pelo catálogo, mas para adicionar outro exercício remova um do treino
  primeiro."; every "Adicionar" disabled.

## 5. Testing

- `src/lib/workoutEditor/autosave.test.ts` (vitest, node): debounce collapses a burst into one
  request; edits during an in-flight save produce exactly one follow-up save; first save of a new
  workout is a nested `POST` with "Novo treino" when unnamed and ids come back by position; an
  existing workout uses `PATCH` + `PUT`; 409 flips to per-item and re-syncs; a per-item delete
  answered 409/502 restores the item and raises the named banner while other ops still run, one
  answered 503 (or a network failure) stops the run in `error` without a banner and `retry()`
  resumes from that op; 400 reverts to
  the snapshot and an edit made while that request was in flight survives the revert and is
  sent by the follow-up save; network failure → `error` and `retry()` re-sends the current draft;
  a create that failed after upstream committed is adopted on `retry()` (the plan now lists a
  new workout with the sent name/day) instead of being re-sent, and a create that failed
  before upstream committed is re-sent; `finish()`
  waits for the pending save.
- Storybook stories (browser tests) for `WorkoutExerciseCard` (default, no sets, dragging,
  set-dragging, not-allowed, cap reached, refused), `SetRow`, `EditorFooter` (idle/saving/saved/
  error), `AddExerciseDialog` (cap), `CloneWorkoutDialog`, and `WorkoutEditorSession` (empty new
  workout with the offer; with exercises).

## 6. Out of scope / follow-ups

- `vertice-api`: return `FAILED_PRECONDITION` from `DeleteExerciseSet`/`DeleteWorkoutExercise`
  when the item has recorded data, and expose `hasRecordedData` on the workout so the web can
  start in per-item mode without a probing 409.
- `vertice-bff`/`vertice-api`: an idempotency key on `POST /training-plans/:planId/workouts`
  (client-generated, echoed back) would replace the reconciliation lookup in §0 with a plain
  retry.
- Touch/mobile drag and drop; keyboard reordering.
- Conflict detection between concurrent editors (E19).
