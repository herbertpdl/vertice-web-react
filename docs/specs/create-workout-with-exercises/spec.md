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
    `exercises` = the draft, order = list position — R17/R18). The substituted `"Novo treino"` is
    a payload-only value, not a mutation of the draft, so on success it is merged into the
    *current* draft and the snapshot the same way tree ids are (§3): if the name field is still
    the blank value that was actually sent, it is set to `"Novo treino"` so the trainer sees the
    name the server assigned instead of a blank field; if the trainer typed a name while
    the request was in flight, that edit is left alone — it already makes the draft dirty against
    the new snapshot and goes out with the chained flush, same as any other edit made mid-save.
    `window.history.replaceState` was
    the wrong tool here: `/treinos/novo` and `/treinos/[workoutId]` are two separate `page.tsx`
    files today, and rewriting the URL bar by hand does not tell the App Router to switch which
    page is mounted, so the `novo` page (and its component tree, including the autosave engine
    and any edits made while the request was in flight) would keep running under a URL that now
    claims to be the created workout. Instead, `treinos/novo/page.tsx` and `NovoTreinoContent.tsx`
    are removed and `treinos/[workoutId]/page.tsx` becomes the single route for both: it treats
    the literal segment value `"novo"` as "no workout yet" (`workoutId: undefined`, no `/full`
    fetch) instead of parsing it as a number, and reads the `dayOfWeek` query param itself
    (`NovoTreinoContent`'s job today) so it needs no client wrapper. `WorkoutEditorSession` is not
    keyed by `workoutId`, so when the create response arrives its ids are written into the draft
    by list position (as before) and the session calls `router.replace(`/planos/${planId}/treinos/${workoutId}`, { scroll: false })`
    from `next/navigation`'s `useRouter` — a same-page-file param change, which the App Router
    re-renders without unmounting the client subtree, so the engine instance, its `sinceSent`
    queue and any edit made mid-request all survive (standard App Router reconciliation; this
    project does not enable Cache Components — `next.config.ts` has no `cacheComponents` flag —
    so there is no `<Activity>` layer to reason about here). Existing links to `/treinos/novo`
    (the plan page's "Novo treino" button and its per-weekday slots) are unaffected: they still
    request that URL, now served by the merged route. A reload after the replace lands on
    `/treinos/:workoutId` normally, same as any existing workout. A new workout with no change
    never flushes (R5/E3).
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
    with `order`/`setNumber` = list position **+ 1** for reorders — upstream's `order`/`setNumber`
    are 1-based, the draft array's index is 0-based, and this holds wherever a position is sent,
    not only here; no unique constraint exists on either column, so sequential `PATCH`es cannot
    collide). Each per-item `POST`'s response id is adopted into the draft and the snapshot by the
    item's client `key`, mirroring `adoptIds` for `replace` (§3), the moment it arrives — so a set
    or exercise created earlier in the same per-item run addresses its real id, not a stale
    `null`, in any later op that targets it. `per-item` is a transport detail of the
    engine, not a product mode: the trainer keeps the same autosave, the same footer status and
    the same screen, nothing is announced and there is nothing to choose (R26, R28 — the PRD's
    §7 "refused whole-list save" row and §10.1 item 4 describe what the trainer sees, and that is
    unchanged); it only decides whether a flush is one `PUT` or a sequence of per-item calls.
    Nor does it change what E19 promises: E19's "last write wins, change by change" is API-E10's
    "whichever edit is processed last is what sticks" — per request, with no conflict detection
    anywhere in the stack. That granularity is not introduced by `per-item` mode: the
    editor shipping today is per-item only (the `useMutation`s listed under "Retired code paths"
    below), and even `replace` mode is two requests (`PATCH` name/weekday, then `PUT` tree), so
    two sessions can already end with one's name and the other's exercises. In `per-item` mode
    their `DELETE`/`POST`/`PATCH` sequences interleave the same way, item by item, and the
    workout can end as a mix of both drafts rather than either one whole. The engine serializes
    only its own session's requests and makes no cross-session promise; the PRD's E19 row is
    worded to match, and the server-side version/transaction contract that would let a session
    detect a stale tree is the §6 follow-up, not something this editor can build alone.
    In that mode a removal of a non-recorded item
    succeeds (E14) and a removal of a recorded item fails upstream (FK `set_logs → exercise_sets`;
    `DeleteExerciseSet`/`DeleteWorkoutExercise` have no explicit check, so the
    `DataIntegrityViolationException` is unmapped in `GrpcExceptionAdvice` and reaches the BFF as
    a generic gRPC status, which `mapGrpcError` renders as **502 `UPSTREAM_ERROR`**).
    **That failed delete is the refused change:** the
    engine restores the item into the draft at its snapshot position, marks it (danger outline +
    "Remoção desfeita — desempenho registrado por um aluno" tag, per the design) and shows the
    "Remoção não aplicada" banner — naming the exercise and set number when the refused delete
    was a set (E13), or only the exercise when it was the whole exercise (E13a: the platform's
    generic FK/502 response cannot say which of the exercise's sets blocked it, so no set number
    is invented; §4 has the exact copy for both). Every other operation in the same flush still
    runs, and *provided all of them succeed*, the status ends in "Salvo" (R27, E13) — a later
    operation failing for a non-refusal reason still lands the flush in `error` per "which delete
    failures count as a refusal" below and §3's per-op flow; a restore is not itself a failure of
    the flush, only of that one op. The banner is dismissed with "Fechar" (R28). No 409 banner is
    shown when the refused replace carried no removal (there is nothing to undo — the per-item
    resync just saves it).
    **Restoring an item mid-run does not invalidate the ops already computed for it, but does for
    any position this run still has left to send.** The per-item diff is computed once, up front,
    against `sent` (the tree with the refused removal already applied) — so a reorder queued
    later in the same run for an item after the restored one still carries the position it would
    have had if the deletion had gone through, which is now wrong by one. So a restore does not
    just patch the draft; it also re-derives, from the *current* tree (snapshot as advanced so
    far, with the restored item back in it), the position value of every remaining op in this
    run that carries one, before that op is sent — not a full re-diff, since only positions can
    have shifted, never which items are being added/removed/edited.
    *Which delete failures count as a refusal.* Only the codes a recorded-data delete actually
    produces: `PRECONDITION_FAILED` (409 — what `vertice-api` will return once the §6 follow-up
    lands) and `UPSTREAM_ERROR` (502 — the FK violation today). A `NOT_FOUND` delete counts as
    done (§3). Everything else — network failure, `UPSTREAM_UNAVAILABLE` (503), 403, 400, unknown
    codes — is **not** a refusal: the per-item run stops there, the draft is kept and the footer
    goes to "Erro ao salvar — Tentar novamente" exactly as for any other failure (next bullet);
    because the snapshot is advanced op by op (§3), the retry resumes from the failed op. Mapping
    every non-2xx to the refusal path would show "desempenho registrado" for a server outage and
    then report "Salvo" for a change that never reached the server. 401 is listed separately, not
    grouped with 403 above, because it never actually reaches this branch: every request goes
    through `apiClient`, which on a 401 fires a hard redirect to `/login` before the caller sees
    anything but a rejected promise (`src/lib/api/client.ts:50–60`) — the same auth-redirect
    exception the rest of the app already has, not a distinct per-item footer state to build.
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
    leaves the draft dirty and goes out with the chained flush (`pendingFlush`) — as does a kept
    name/weekday on a create that was rejected, since the branch decides `pendingFlush` by the
    ordinary dirty check against the snapshot (§3), not by whether the replay produced anything. A
    plain `draft tree = snapshot tree` would have thrown those edits away and then reported
    "Salvo" because the chained flush saw a clean draft. The footer does not go to `error` on this
    path: it ends in `saved` for an existing workout (the screen now matches the server — E9, not
    E16) and in `idle` when the rejected request was the create and nothing is left to send
    (nothing exists yet); §3 spells out why, and why "Tentar novamente" would be meaningless here.
- **Any other failure (network, 5xx, 503) leaves the draft on screen and sets the footer to
    "Erro ao salvar — Tentar novamente" (R9, R10, E16).** "Tentar novamente" calls `flush()` again
    with the *current* draft (R10). No automatic retry: the trainer decides.
- **Leaving the editor while a save is pending or failed is guarded on both exit paths (R12,
    E17, E18).** A native unload (reload, close tab, typed URL) is caught by `beforeunload`, which
    only fires for a document unload — it does not run for an in-app `<Link>` or `router.push`,
    which keep the document alive. In-app navigation away from the editor is not only the
In-app navigation away from the editor is not only the
    persistent `Header`'s nav links (`src/components/layout/Header.tsx`): `WorkoutEditor` renders
    its own breadcrumb `<Link>`s to the student and the plan (today at
    `src/components/domain/WorkoutEditor.tsx:90–102`, carried into `WorkoutEditorSession`), and
    app-shell ones — a per-component patch would silently miss the next one added anywhere in the
    tree. So the guard is a `NavigationBlockerContext` (the shared-state pattern Next documents
    for exactly this — blocking navigation from any link while a form is being edited), provided
    once by the `(app)` layout above both `Header` and the routed page: its `isBlocked` flag is
    true whenever the mounted editor session's footer status is `saving` or `error`, and both
    `Header`'s nav links and the editor's own breadcrumb links read it in `onNavigate`, calling
    `window.confirm` and `event.preventDefault()` on a cancel — mirroring `beforeunload`'s
    condition exactly, from one flag instead of two independent patches. `finish()`'s own
    `router.push` back to the plan needs no guard — it only runs after its flush resolves to a
    non-`error` status (previous bullet). The app shell has one other programmatic exit that is
    not a `<Link>`: `AppHeader`'s "Sair" action (`src/components/layout/AppHeader.tsx:28–33`,
    `handleSignOut` → `logout()` then `router.push("/login")`). It reads
    `isBlocked` the same way `finish()` reads the flush status — a `window.confirm` guard before calling `handleSignOut`,
    not before the `router.push` inside it, since sign-out is a single user-initiated action, not
    two — so signing out while the editor is saving or in error warns first instead of losing the
    draft silently. Any future programmatic exit from the editor must do the same. Browser
    back/forward remain unguarded (a same-document history transition, not a `<Link>` click or
    button) — see the PRD's explicit R12 exception (§6).
- **A failed create is not reconciled by guessing — it is just re-sent, and a resulting duplicate
    is a known, accepted risk (not silently corrected).** Neither the BFF nor `vertice-api` has an
    idempotency key on `POST /training-plans/:planId/workouts`, and a network failure or gateway
    5xx can arrive after upstream committed the insert — the workout exists, but `workoutId` is
    still `null` on the web. An earlier version of this spec tried to close that gap by listing
    the plan's workouts and adopting whichever one not seen before matched the sent `name`/
    `dayOfWeek`. That is unsound at any candidate count, not just when there is more than one:
    matching by content instead of identity can adopt a workout another tab created around the
    same time with the same name and weekday, and every following `PATCH`/`PUT` in the session
    would then silently edit that unrelated workout — a single, unambiguous-looking match is just
    as much a guess as an ambiguous one, only quieter about it. There is no way to tell "my lost
    create" apart from "someone else's coincidentally identical create" without a correlation key
    the platform does not have, so `retry()` does not try: it re-sends the `POST` as it would any
    other retry, with everything that implies — if the first attempt actually committed, the plan
    ends up with two "Novo treino" entries. That is a visible, low-severity, trainer-fixable
    outcome (delete the extra one); silently editing the wrong workout's data is not, which is
    why this spec no longer trades one risk for the other. An idempotency key on the BFF/API
    remains the real fix; tracked in §6.
- **Footer status is derived from the engine, nowhere else (R9, R13).** `idle` (never saved,
    nothing pending — "As alterações são salvas automaticamente" with the info icon, as in the
    empty-workout frame), `saving` (from the moment a change is made, through the debounce window
    and the request — "Salvando…"), `saved` ("Salvo"), `error`. Counting the debounce window as
    "saving" is deliberate: it is the only window (together with `error`) in which leaving loses
    something, so it must be exactly the condition both leaving guards warn on (R12, E17, E18).
- **"Concluir" flushes then navigates (R11, E17).** `finish()` cancels the timer and, if a flush
    is already in flight, only awaits it — it never itself sets `pendingFlush` or schedules a
    second one. Once idle, if the draft is dirty or the flush it awaited ended in `error`, it
    calls the exact same function `retry()` calls — not a separate implementation, so the two
    can't drift the way this bullet and §3 briefly did: for a failed create it re-sends the `POST`
    with the accepted duplicate-on-retry risk §0 documents, and for a failed per-item op it
    re-sends that op as-is, with the same known duplicate-on-retry limitation §3 documents (R20
    rules out a safer, content-based adoption in both cases). It
    resolves `true` only when the resulting status is not `error`; the editor then invalidates the
    plan/workout queries and `router.push`es to the plan. On `false` it stays, with the footer in
    the error state.
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
    shown only while `openedAsNew && !hasAddedExercise` — `hasAddedExercise` is a session flag
    set once, the first time an exercise (from the catalog picker *or* from this same fill) lands
    in the draft, and never cleared again. Gating on `exercises.length === 0` instead would bring
    the offer back if the trainer added an exercise and removed it again before the first 800 ms
    flush (`openedAsNew` still `true`, length back at `0`), contrary to R24's "removes it for
    good". Naming the workout (which creates it) does not set the flag, so it keeps the offer;
    the first exercise does, permanently. `POST /workouts/:id/clone` and `cloneWorkout()` are
    removed from the web: nothing uses them any more. If the source exceeds a cap, the fill is
    refused and the footer shows the error state with the reason (E8).
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
| `src/app/(app)/planos/[planId]/treinos/[workoutId]/page.tsx` | Now the only route for the editor: treats `workoutId === "novo"` as no workout yet (was a separate `treinos/novo/page.tsx`) and reads the `dayOfWeek` query param for that case |
| `src/app/(app)/planos/[planId]/treinos/novo/page.tsx`, `NovoTreinoContent.tsx` | Removed — merged into `[workoutId]/page.tsx` above, so a create's `router.replace` is a same-file param change, not a page swap |
| `src/components/domain/WorkoutEditor/WorkoutEditor.tsx` | Loads plan/student/workout, then renders `WorkoutEditorSession` (draft, header, list, DnD, footer, banners); its student/plan breadcrumb `Link`s consume `NavigationBlockerContext` |
| `src/lib/navigationBlocker.tsx` | `NavigationBlockerContext`/`NavigationBlockerProvider` (`isBlocked` state) mounted by the `(app)` layout; consumed by `Header`'s nav links, the editor's breadcrumb links, and `AppHeader`'s "Sair" action |
| `src/components/domain/WorkoutExerciseCard/WorkoutExerciseCard.tsx` | Presentational card: handle, order badge, rest, notes, sets table, drag/refusal/cap states |
| `src/components/domain/SetRow/SetRow.tsx` | Presentational row with per-field commit + drag handle + duplicate/remove |
| `src/components/domain/AddExerciseDialog/AddExerciseDialog.tsx` | Picker → `onPick(exercise)`; `atCap` banner and disabled actions |
| `src/components/domain/CloneWorkoutDialog/CloneWorkoutDialog.tsx` | Picker → fetches `/workouts/:id/full` → `onPick(full)` |
| `src/components/domain/EditorFooter/EditorFooter.tsx` (+ `index.ts`) | New: status (`idle`/`saving`/`saved`/`error`) + "Concluir" |
| `src/components/domain/<Name>/<Name>.stories.tsx` (one per component above, next to it), `src/components/domain/storyFixtures.ts`, `storyQuery.tsx` (shared helpers, at the group root) | Storybook states for the card, set row, footer, dialogs and the editor session (fake transport, seeded query cache) |
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

State exposed to React: `{ workoutId, draft, status, mode, refusal, errorMessage, openedAsNew,
hasAddedExercise }`.

```
edit ──▶ draft' ──▶ status = saving, arm timer (800 ms)
timer ──▶ flush():
   in flight?  → pendingFlush = true, return
   clean?      → status = saved | idle, return
   sent = draft; sinceSent = []   (every edit while in flight is appended)
   workoutId null → POST create(nested)
                    2xx        → workoutId = response id, ids by position → snapshot → done
                    non-4xx    → status = error [terminal]; retry() re-sends the create as-is
                                  (accepted duplicate-on-retry risk, §0 — no reconciliation)
                    400        → draft tree = reduce(empty tree, sinceSent), banner(generic
                                  message); pendingFlush = dirty(draft, snapshot) → done (§0 —
                                  same revert-and-replay as the existing-workout 400 branch
                                  below; the snapshot here is the pristine new-workout draft,
                                  so a kept name/weekday makes it dirty as much as a survivor)
                    other 4xx  → status = error [terminal]; nothing was created
   else           → PATCH name/day if changed; after a 2xx response, advance the snapshot's name/day to the values sent before any tree operation below
                    tree changed & mode=replace → PUT replace
                       2xx  → ids by position → snapshot → done
                       409  → mode = per-item, pendingFlush = true (re-sync same diff) → done
                       400  → draft tree = reduce(snapshot tree, sinceSent), banner(generic
                              message); pendingFlush = dirty(draft, snapshot) → done
                       other → status = error [terminal]
                    tree changed & mode=per-item → diff(snapshot, sent) as DELETE/POST/PATCH,
                       each op advancing the per-item snapshot on 2xx
                       DELETE 404 → counts as done for that op
                       DELETE 409 PRECONDITION_FAILED / 502 UPSTREAM_ERROR → restore item,
                                   banner(named), continue with the remaining ops
                       any op, other failure → status = error [terminal; per-item snapshot
                                already advanced for the ops that succeeded]; retry() re-sends the
                                same failed op (known limitation below)
                       all ops settle → done
   done: pendingFlush ? flush() : status = (workoutId null ? idle : saved)
```

`[terminal]` means the flush ends there without reaching `done`: a flush that fails with no new
edits queued stays in `error` rather than falling through to `done`, which would otherwise report
a failed save as "Salvo" (R9) — or, for a failed create, as the never-saved `idle`. A `pendingFlush` left `true`
by an edit made while the failed request was in flight is not chained automatically from an
`[terminal]` branch either — it is picked up by the next `flush()` call, from "Tentar novamente"
or the debounce timer of a further edit, keeping R10's "no automatic retry" intact.

A handled 400 is a non-2xx answer that reaches `done` instead of ending `[terminal]` (as a 409
and a refused or already-gone per-item delete also do), and the footer state it lands in is
deliberate, not a fall-through. After the revert, the branch runs the ordinary dirty check
against the snapshot and sets `pendingFlush` from its result — not from "did anything survive the
`sinceSent` replay", which would miss a kept name/weekday that was part of `sent` — so `done`
either chains a flush for whatever is dirty or reports on a draft that *is* the server's state,
and the footer says what is true of the screen. For an existing workout that is
`saved`: the rejected change is undone and reported by the banner, which is E9's outcome, distinct
from E16's "the change stays on screen, footer in error". `error` here would make "Tentar
novamente" re-send content identical to the snapshot — a no-op R10 does not describe — and make
the R12 leaving guard warn about a loss that cannot happen. For a workout the rejected request
was supposed to *create*, `workoutId` is still `null` at `done`, so the state is `idle` ("As
alterações são salvas automaticamente"), never `saved` — nothing has been saved yet; the create
400 branch is the only way `done` runs with `workoutId === null` (every other route to `done` is
under `else`, and the create's 2xx assigns `workoutId` before reaching it). Because a never-created
workout's snapshot is its pristine draft (below), the kept name/weekday count like any edit: a name
or weekday set before the rejected create leaves the draft dirty, so `done` chains a flush that
re-sends the create with it and an empty tree (R3/R4), while a workout whose only change was the
rejected batch — E2's nameless add on the weekday it opened with, say — is clean, ends in `idle`
and creates nothing (R5). `idle` is therefore never reached with a dirty draft, so the R12 guard
being off in that state is right.

*Known limitation: a per-item `POST` retry can duplicate a row.* Unlike the top-level create
(§0), a per-item `POST`'s result cannot be reconciled by refetching `/full` and matching on
content: R20 explicitly allows the same catalog exercise more than once, so a lost response
(network drop, 502, after the row actually committed) can leave two rows — the original and the
one `retry()`'s re-`POST` creates — indistinguishable from each other or from a genuinely
duplicate item the trainer added on purpose. There is no per-item idempotency key to resolve this
(§6 follow-up, extended to cover these endpoints too), so the engine does not attempt a guess:
it re-sends the failed op as-is, and in the rare case a duplicate results, the trainer sees and
can remove the extra row like any other edit.

Dirty check = deep-compare of `sent` against `snapshot` (name/day and the tree separately).
Until the workout is created, `snapshot` is the pristine new-workout draft the session opened
with (blank name, the weekday from R2, no exercises): that is what the `clean?` check at the top
of `flush()` compares against when nothing has been saved yet (R5 — a name typed then cleared
again before the timer fires is clean and never creates anything), and what the create-400
branch compares against after its revert. After a create/replace the snapshot is **the tree as sent plus the ids/positions the server
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
  série voltou para a tela. O restante do treino continua sendo salvo automaticamente." (E13; exercise
  variant, E13a — names only the exercise, since the platform does not say which of its sets
  blocked the removal, per the PRD's R27: "…em {exercício}, então esse exercício não pode mais
  ser removido. A remoção foi desfeita e o exercício voltou para a tela. …") with "Fechar"; the
  restored card gets the danger outline and the restored row the danger outline + lock tag.
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
  resumes from that op; a refused delete followed later in the same run by a reorder PATCH for a
  different item sends that item's *current* position, not the one computed before the restore;
  400 reverts to
  the snapshot and an edit made while that request was in flight survives the revert and is
  sent by the follow-up save; a 400 with nothing surviving ends in `saved` for an existing
  workout and in `idle` (with no `POST` re-sent) for a never-created one whose name is still
  blank and whose weekday is still the one it opened with, never in `error`, while a rejected
  create with a typed name or a changed weekday re-sends the create with them and an empty tree; network failure → `error` and `retry()` re-sends the current draft,
  including a create — `retry()` never lists or matches other workouts to guess whether it
  already committed; a flush that ends in `error` with nothing queued stays
  in `error` (never falls through to `saved`, nor to `idle` for a failed create); a per-item `POST`'s id is adopted by key so a
  later op in the same run targets it, not `null`; `finish()` awaits a pending save without
  scheduling a second one and calls the same retry path `retry()` does for a failed create or
  per-item op, not a bare `flush()`; creating a new workout with a blank name shows "Novo treino"
  in the field afterward, not a blank one, and a name typed while that create was in flight is
  not overwritten by it.
- `hasAddedExercise` (reducer/model tests): set on the first `addExercise` regardless of source
  (picker or "usar como base") and unaffected by a later removal, so the offer does not reappear
  after an add-then-remove.
- Storybook stories (browser tests) for `WorkoutExerciseCard` (default, no sets, dragging,
  set-dragging, not-allowed, cap reached, refused), `SetRow`, `EditorFooter` (idle/saving/saved/
  error), `AddExerciseDialog` (cap), `CloneWorkoutDialog`, and `WorkoutEditorSession` (empty new
  workout with the offer; with exercises; offer gone after an add-then-remove).
- `NavigationBlockerContext` (component tests): `Header`'s nav links, `WorkoutEditor`'s breadcrumb
  links, and `AppHeader`'s "Sair" action all block with `window.confirm` while the mounted
  editor's status is `saving`/`error`, and let navigation/sign-out through otherwise.

## 6. Out of scope / follow-ups

- `vertice-bff`: document the 502 `UPSTREAM_ERROR` code in `docs/api-contract.md`'s common-codes
  list. §0's per-item refusal detection depends on it (the FK-violation delete failure), and it is
  real behavior — `mapGrpcError`'s fallback for an unmapped gRPC status — but as of vertice-bff#17
  only `PRECONDITION_FAILED`/409 was added to that list; `UPSTREAM_ERROR` isn't documented on
  `main` or on #17/#18, so this spec is currently the only place it's written down.
- `vertice-api`: return `FAILED_PRECONDITION` from `DeleteExerciseSet`/`DeleteWorkoutExercise`
  when the item has recorded data, and expose `hasRecordedData` on the workout so the web can
  start in per-item mode without a probing 409.
- `vertice-bff`/`vertice-api`: an idempotency key on `POST /training-plans/:planId/workouts`
  (client-generated, echoed back) is the only real fix for the accepted duplicate-on-retry risk
  in §0 — a content-based match (name/weekday) was tried and rejected as unsafe at any candidate
  count, not just an ambiguous one. The same is true of the per-item `POST` endpoints
  (`workout-exercises`, `exercise-sets`) and the known duplicate-on-retry limitation in §3, where
  content-based reconciliation is not an option at all because duplicate items are allowed (R20).
- Touch/mobile drag and drop; keyboard reordering.
- Conflict detection between concurrent editors (E19): a server-side version (ETag /
  `If-Match`) or transactional contract on the workout, so a session that edits a stale tree is
  told so instead of overwriting it request by request — item by item in `per-item` mode. Nothing
  in the stack detects the overlap today (API-E10), and the web cannot add it on its own.
