# PRD: Create Workout With Exercises (Web)

Status: Draft
Design: design-ok — approved by the owner on 2026-09-15 after reviewing the pen.dev design (§10).
Owner: hebertpdl@gmail.com
Related: [vertice-api/docs/prds/create-workout-with-exercises/prd.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/create-workout-with-exercises/prd.md) (source PRD — its rules
R1–R16 and edge cases E1–E11 are the product rules this document assumes; they are referred to
below as `API-R#`/`API-E#` and not restated), [vertice-api/docs/requirements.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/requirements.md) (source
requirement: "Create a workut that is a training for a given weekday" and "Assign the created
workout into a training plan for a client/costumer"), [vertice-bff/docs/specs/create-workout-with-exercises/spec.md](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/create-workout-with-exercises/spec.md)
(the bridge that makes the behavior below reachable from the web; in review as
[vertice-bff#18](https://github.com/herbertpdl/vertice-bff/pull/18) — the `main` link resolves once it merges)
Spec: [docs/specs/create-workout-with-exercises/spec.md](../../specs/create-workout-with-exercises/spec.md)

## 1. Summary

Today the web's workout editor makes a trainer build a workout in many explicit steps. On a new
workout the trainer must first name it and press "Criar treino" before a single exercise can be
added; from then on every added exercise, every added or edited set, every rest/notes change and
every removal is written the moment it happens, with no visible confirmation, and there is no way
to reorder exercises or sets at all. "Usar treino existente como base" creates a separate copy of
another workout and opens it, rather than letting the trainer start from it. This PRD defines the
editor as a single, always-saved workspace: the trainer opens it and simply works — names the
workout, picks a weekday, adds exercises and sets, drags them into order — and every change is
saved automatically a short moment after it is made, for new and existing workouts alike. A new
workout comes into existence silently on its first automatic save; there is no "create" step, no
draft, no "save" button and no separate editing mode. One save status in the footer tells the
trainer whether the latest change is being saved, is saved, or failed.

## 2. Actors

**Trainer**
- Can start a new workout and begin adding exercises and sets immediately, without naming or
  creating it first.
- Can add, edit, remove and reorder (by drag and drop) exercises and sets; every change is saved
  automatically shortly after it is made.
- Can see, at all times, whether the latest change is being saved, is saved, or failed, and can
  retry a failed save.
- Cannot remove an exercise or set that a client has already recorded performance data against;
  that one change is refused and undone, everything else keeps saving (API-R12/R13).
- Cannot go over 20 exercises in a workout or 10 sets in an exercise (API-R8/R9).

**Client**
- Unaffected. Sees the same finished workout regardless of how the trainer built it (API-R16).
- Cannot create, edit or rewrite a workout (existing rule, unchanged).

## 3. Flows

**Trainer: create a workout with exercises**
1. From a training plan's page, trainer starts a new workout — either with the plan's "Novo
   treino" action or from an empty weekday slot, which pre-selects that weekday.
2. Trainer lands in the workout editor on a workout that does not exist yet: name, weekday, an
   empty exercise list and the "Usar treino existente como base" action.
3. Trainer types a name and/or adds exercises from the catalog. The first change creates the
   workout silently; if the first change is not the name, the workout is created as "Novo
   treino" and the trainer renames it whenever they want. "Usar treino existente como base"
   disappears as soon as the first exercise is in the list.
4. Trainer keeps adding exercises, dragging them into the order they should be performed, and
   for each one optionally adds sets (reps, weight, strategy, rest, notes…), dragging those into
   order too. Each change is saved a short moment after it is made; the footer shows
   "Salvando…" then "Salvo".
5. Trainer presses "Concluir" and is back on the plan's page with the new workout listed.

**Trainer: create an empty workout**
1. Same as above, but the trainer only names the workout (or picks a weekday) and presses
   "Concluir". An empty workout exists, to be filled in later (API-R1).

**Trainer: edit an existing workout**
1. Trainer opens an existing workout in the editor from the plan's page.
2. Trainer renames it, changes the weekday, reorders, adds, edits and removes exercises and
   sets. Each change is saved automatically; the footer shows the save status.
3. Trainer presses "Concluir" and is back on the plan's page. If a save is still pending at
   that moment it is completed first.

**Trainer: a change is refused because a client recorded data**
1. Trainer removes an exercise or a set of an existing workout.
2. A client has already recorded performance data against it, so that removal is refused: the
   exercise or set comes back on screen and a message names it. Nothing else is affected; the
   trainer dismisses the message and keeps editing, with every other change still saved
   automatically (API-R12/R13).

## 4. Rules

**Starting a workout**

- R1: Starting a new workout opens the editor directly on a workout that does not exist yet;
  there is no separate "create first, then add exercises" step.
- R2: A new workout started from a weekday slot has that weekday pre-selected; one started from
  the plan's "Novo treino" action starts on the first weekday, as today.
- R3: A new workout is created silently by its first automatic save — the first change the
  trainer makes, whether typing a name, picking a weekday or adding an exercise — with no
  "Criar treino" action.
- R4: If the first change is not the name, the workout is created with the automatic name
  "Novo treino", which the trainer can change at any time.
- R5: A new workout the trainer leaves without making any change is never created.
- R6: A workout left with no exercises is an empty workout (API-R1/E1).

**Automatic saving**

- R7: Every change in the editor — name, weekday, adding, editing, removing or reordering an
  exercise, adding, editing, removing or reordering a set — is saved automatically a short
  moment after it is made, for new and existing workouts alike; there is no "save" action.
- R8: Changes made while a save is still pending are included in the next save, so the trainer
  never waits for one save to finish before making the next change.
- R9: The footer shows one save status for the whole editor — "Salvando…" while a save is in
  progress, "Salvo" once the latest change is saved, "Erro ao salvar — Tentar novamente" if a
  save failed — and no other save status appears anywhere on the screen.
- R10: "Tentar novamente" re-attempts the failed save with the editor's current content.
- R11: The footer's only button is "Concluir", which returns to the plan's page; if a save is
  pending at that moment it is completed first. ("Tentar novamente" is part of the error status
  text, R9/R10 — not a second footer action.)
- R12: Leaving the editor (navigating away, reloading, closing the tab) warns the trainer only
  while a save is in progress or the last save failed; otherwise the trainer leaves freely. Does
  not cover the browser's back/forward buttons (§6).
- R13: The editor never shows "unsaved changes" or "draft" wording, because there is nothing
  unsaved to point at.

**Building the workout**

- R14: A trainer adds an exercise by picking it from the exercise catalog.
- R15: A trainer reorders exercises by dragging them within the exercise list.
- R16: A trainer reorders sets by dragging them within their own exercise; a set cannot be
  dragged into another exercise.
- R17: The order exercises appear on screen is the order they are saved in; the trainer never
  types a position number (API-R4).
- R18: The order sets appear under an exercise is the order they are saved in; the trainer never
  types a set number (API-R5).
- R19: A newly added exercise starts with the same defaults as today (60 seconds of rest between
  sets, no notes); a newly added set starts as a plain working set with everything else empty,
  as today (API-R6).
- R20: The same catalog exercise can be added to a workout more than once (API-R7/E5).
- R21: The editor does not let the trainer add a 21st exercise, and says why (API-R8).
- R22: The editor does not let the trainer add an 11th set to an exercise, and says why
  (API-R9).
- R23: Creating a new catalog exercise from inside the editor's picker adds it to the catalog
  immediately; adding it to the workout then follows R14.

**"Usar treino existente como base"**

- R24: "Usar treino existente como base" is offered only on a workout opened as new, and only
  until its first exercise is added; typing a name first (which creates the workout) keeps the
  offer, adding an exercise removes it for good, and it is never offered when reopening an
  existing workout, even one with no exercises.
- R25: "Usar treino existente como base" fills the workout's name, weekday, exercises and sets
  with the chosen workout's, with no confirmation, and that fill is saved automatically like any
  other change; it never creates a separate copy.

**Changes refused because a client recorded data**

- R26: A workout a client has recorded performance data against looks and behaves like any
  other workout in the editor; nothing is announced up front.
- R27: When a change would remove an exercise or set that a client has already recorded
  performance data against, that change alone is refused: it is undone on screen and a message
  names the blocking exercise and, when the removed item was a set, the set as well (API-R12/R13)
  — removing an exercise is refused by the same recorded-data check applied to *some* set inside
  it, but the platform does not say which one, so that variant names only the exercise; everything
  else keeps being saved automatically.
- R28: The refusal message offers no alternative editing mode; the trainer dismisses it and
  keeps editing.

**Unchanged**

- R29: Nothing changes in how a client views or performs a workout (API-R16).

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Trainer starts a new workout, types a name, adds nothing, presses "Concluir". | Empty workout with that name exists; back on the plan's page with it listed. | R3, R6, R11 |
| E2 | Trainer starts a new workout and adds an exercise before typing any name. | Workout is created as "Novo treino" with that exercise; the trainer can rename it at any time. | R3, R4 |
| E3 | Trainer starts a new workout, changes nothing, presses "Concluir" or leaves. | No workout is created; no warning. | R5, R12 |
| E4 | Trainer adds an exercise and leaves it with no sets. | Exercise saved with zero sets (API-E6). | R7 |
| E5 | Workout has 20 exercises; trainer opens the picker. | Adding is blocked with a message; picker may still be browsed. | R21 |
| E6 | Exercise has 10 sets; trainer clicks "Adicionar série". | Blocked with a message. | R22 |
| E7 | Trainer opens a new workout, types a name (which creates it), then uses "Usar treino existente como base". | Still offered; name, weekday, exercises and sets are replaced by the chosen workout's, with no confirmation, and saved automatically. | R24, R25 |
| E8 | Source workout for "usar como base" has more than 20 exercises or an exercise with more than 10 sets. | Cannot happen for workouts built through the web after this change; if it does, the fill is refused, the list stays as it was and the footer shows the error. | R9, R25 |
| E9 | A save is rejected because an exercise no longer exists in the catalog (deleted meanwhile). | The change that was being saved is undone on screen and the message is the platform's generic one — the web does not point at the specific entry (API-E3 and its "generic message" decision). | R7, R9 |
| E10 | Trainer drags one exercise to a new position. | New order saved automatically a moment later. | R7, R15, R17 |
| E11 | Trainer drags a set onto another exercise. | Not allowed; the set snaps back to its own exercise. | R16 |
| E12 | Client opened this week's session but recorded nothing; trainer removes one of its exercises. | Allowed (API-E9/R14). | R7 |
| E13 | Client has recorded a set; trainer removes that set. | Refused; the set comes back on screen; message names the exercise and the set; all other changes keep saving. | R27, R28 |
| E13a | Client has recorded a set; trainer removes its exercise instead. | Refused; the exercise comes back on screen; message names the exercise only — the platform does not say which of its sets blocked the removal; all other changes keep saving. | R27, R28 |
| E14 | Client has recorded a set in exercise 1; trainer edits exercise 2 or adds a new exercise. | Saved normally; only removals of recorded exercises/sets are protected (API-R12/R14). | R7, R27 |
| E15 | Trainer types several set values quickly, one after the other. | They are saved together in the next save; the footer shows "Salvando…" once, then "Salvo". | R8, R9 |
| E16 | A save fails (network, platform error). | Footer shows "Erro ao salvar — Tentar novamente"; the trainer's change stays on screen; leaving the page now warns first. | R9, R10, R12 |
| E17 | Trainer presses "Concluir" while the footer says "Salvando…". | The pending save completes first, then the trainer is back on the plan's page. | R11 |
| E18 | Trainer closes the tab while the footer says "Salvo". | Leaves freely, no warning; everything is already saved. | R12 |
| E19 | Two trainers (or two tabs) edit the same workout at the same time. | Last write wins, change by change as each reaches the platform; no conflict detection (API-E10). Because a session's edits reach the platform as more than one request, the workout can end up with a mix of both trainers' changes rather than either one's whole version — the same as the editor today. | — |
| E20 | Trainer removes every exercise from a workout, or reopens an existing workout that has none. | Workout stays (or opens) empty; "Usar treino existente como base" is not offered — it exists only before a new workout's first exercise. | R6, R24 |

## 6. Out of scope

- **A draft, a "save" button, a "discard" action, or any editing mode other than automatic
  saving.** Owner's design review (§10.1 item 4): the editor always saves shortly after each
  change; there is no draft to keep, discard or warn about.
- **Showing up front whether a workout has recorded data.** The platform does not expose "this
  workout has recorded data" yet (see BFF spec §0/§6). Each refused removal is reported when it
  happens (R27); the web does not remember refusals per device.
- **Undo / version history of a workout.** Not asked for; automatic saving is immediate and
  last-write-wins.
- **Confirming "Usar treino existente como base".** Only a name/weekday can be overwritten at
  that point (R24/R25), so no confirmation is asked. Owner's choice.
- **"Usar treino existente como base" on an existing workout** (empty or not), or appending to
  one that already has exercises. The action stays "start from this" on a new workout only (R24).
  Owner's choice.
- **A stay-on-page save or a "save as new" action.** Saving is automatic; "Concluir" just
  returns to the plan's page (R11).
- **Creating a training plan with all its workouts in one step.** Not asked for (API PRD §6).
- **Any change to the client's session, progress or plan screens.** Nothing changes for the
  client (API-R16).
- **Conflict detection between concurrent edits.** Matches the rest of the product (API-E10).
- **Warning on the browser's back/forward buttons.** R12's warning is implemented as the native
  `beforeunload` prompt (§10, step 1) plus a same-document guard on the app's own links (spec
  §0); neither can intercept a back/forward history transition, which is not a page unload and
  not a link click. A reliable, cross-browser guard for that case does not exist without a
  browser API this product does not otherwise depend on, so R12 is scoped to reload/close/typed-URL
  and in-app link or button navigation; back/forward stays unwarned, same as every other unsaved
  state already in the app today.

## 7. Decisions

Rows marked *Superseded* record the first interview's outcome; they were overturned by the
owner's design review (§10.1 item 4, "always save the changes with a small delay") and the
follow-up interview, and are kept so the history stays visible.

| Question | Decision | Why |
|---|---|---|
| Draft with one save, or keep saving each change immediately? | ~~Draft with one save, for new and existing workouts; immediate saving survives only as the post-refusal one-at-a-time mode~~ **Superseded by the owner's design review (§10.1 item 4): the whole editor saves automatically a short moment after every change, for new and existing workouts alike; no draft, no "Salvar e Concluir", no separate mode.** | Owner: "it should always save the changes with a small delay after the change is made". Autosave removes the create step, the draft/discard bookkeeping and the mode switch at once. (owner's decision) |
| How does a new workout come into existence under autosave? | Created silently by the first automatic save (name typed, weekday picked or first exercise added); no "Criar treino" step | Keeps the first-exercise flow uninterrupted. (proposed, accepted — owner selected this) |
| What if the trainer adds an exercise before typing a name? | The workout is auto-named "Novo treino" so the first save never blocks; the trainer renames it whenever | The alternative (blocking the first exercise until a name exists) reintroduces the create step. (proposed, accepted — owner selected this) |
| Reordering: add it, and how? | Yes, by drag and drop — exercises within the list, sets within their own exercise; every drop is saved automatically | The API PRD's rewrite flow lists reordering explicitly and list position is now the only way order is expressed (API-R4/R5). Owner chose drag and drop over up/down buttons. |
| Can a set be dragged into another exercise? | No | Keeps a set's meaning tied to its exercise; not asked for. (proposed, accepted) |
| Footer actions? | ~~"Salvar e Concluir" (save, then back to the plan) and "Descartar" (confirm if unsaved changes); no stay-in-editor save~~ **Superseded (§10.1 item 4): a single "Concluir" button plus one inline save status — "Salvando…" / "Salvo" / "Erro ao salvar — Tentar novamente".** | With autosave there is nothing to save or discard explicitly; the status is what tells the trainer they can leave. (owner selected this) |
| Where does the save status live? | ~~Inline next to the name/weekday fields, for the header's own immediate saves~~ **Superseded: one status area in the footer, for every change; the header shows no status of its own.** | Two statuses on one screen would contradict each other; the footer one covers name and weekday too. (owner selected this) |
| Do name/weekday of an existing workout join the draft? | ~~No — saved immediately as today, with inline "Salvando…"/"Salvo" feedback~~ **Superseded: there is no draft; name and weekday are autosaved like everything else and report through the footer status.** | Same as above. |
| "Salvar e Concluir" with nothing changed? | ~~Acts as "Concluir"~~ **Superseded: there is only "Concluir".** | — |
| Keep the draft across a reload? / Leave warning? | ~~No — warn, then lose it~~ **Superseded: nothing is unsaved after a short moment; leaving warns only while a save is in progress or has failed, and "Concluir" completes a pending save before returning.** | A warning on every exit would be noise; the only moment something can be lost is mid-save or after a failure. (proposed, accepted) |
| "Usar treino existente como base": separate copy, or seed the editor? | Seed the editor (fills name, weekday, exercises and sets), saved automatically; never a separate copy | Lets the trainer adjust before moving on and leaves no stray workout. (proposed, accepted) |
| When is "Usar treino existente como base" offered? | ~~On new workouts only~~ **Superseded by the owner's design review (§10.1 item 3): on a workout opened as new, until its first exercise is added — typing a name first keeps it; never on an existing workout, even an empty one.** | Owner: "make the option disappear whenever the trainer adds the first exercise". Owner chose "new workouts only" over "any workout with no exercises", and confirmed that naming the workout (which creates it) must not remove the offer — only the first exercise does. |
| "Usar como base" on a workout that already has content: replace or append, with confirmation? | ~~Replace, after confirmation~~ **Superseded: no confirmation — the action only exists before the first exercise, so only a name/weekday can be overwritten; the fill replaces them.** | Nothing meaningful to lose. (proposed, accepted) |
| What happens on a refused whole-list save? | ~~Nothing changes, draft stays on screen, blocker named, offer to switch to one-at-a-time~~ **Superseded: there is no whole-list save. When a single change would remove a recorded exercise/set, that change alone is refused and undone on screen, a message names the blocking exercise (and the set too, when a set was the item removed — R27), and everything else keeps autosaving; no mode switch, no banner-locked screen. (How the web sends a save to the platform — one request or several — is a spec detail the trainer never sees; this row is about the screen's behavior.)** | Matches API-R12/R13 at the granularity autosave works in; the trainer loses only the one refused change. Owner chose this over a banner-locked read-only editor. (proposed, accepted) |
| Locked workout reopens as a draft and is refused again — acceptable? | ~~Yes, for now~~ **Superseded: no draft; a workout with recorded data looks like any other and only removals of recorded items are refused, one at a time.** | The platform still does not say up front that a workout has recorded data (BFF spec §6 follow-up); the per-change refusal is enough feedback meanwhile. (proposed, accepted) |
| Is the one-at-a-time switch available at any time? | ~~No, only after a refusal~~ **Superseded: there is no one-at-a-time mode; autosave is the only behavior.** | — |
| Reordering in one-at-a-time mode? | ~~Not available~~ **Superseded: there is no separate mode; reordering is available everywhere.** | — |
| Enforce the 20/10 caps in the editor or rely on the save being rejected? | Enforce in the editor, and the save is still rejected if somehow exceeded | Hitting a cap at save time after building 21 exercises is a worse experience than being stopped at the 21st. (proposed, accepted) |
| Defaults for a new set / new exercise? | Same as today: plain working set with nothing else filled; 60 s rest between sets | No reason to change them; API-R6 makes the platform default the same plain working set. (proposed, accepted) |
| Weekday pre-selection from a plan slot? | Kept as today | Unchanged. |

## 8. Open questions

None.

## 9. Technical constraints (stated by the owner)

- "remember that this product is still in development and no deployments exists, so it is
  completely safe if we have any breaking change to be implemented."

## 10. Design gate (stated by the owner)

- "before implementing, the agent should go to the pen.dev where the design files for the
  project are at and implement all the changes on the design first, and only go for the
  implementation after I check a new design status flag on the document as `design-ok`."

### 10.1. Design notes (from the owner's design review — all done)
- This section records the issues the owner found in the design; each had to be addressed before the implementation on the code, and each is marked with how it was resolved.
1. On the "Novo treino" screen, there's a misalignment on the "Nome do treino" input and "Dia da semana" dropdown that is present across all the screens for this feature. — **Done (design):** on every editor frame in the `Vertice — Editor de treino (salvamento automático)` root frame the two fields now start at the same top edge and their boxes share the same height, so label, box and the header actions line up.
2. On the screen that shows "Limite de 20 exercícios atingido" there's a wrong  positioning of the "Usar treino existente como base" button, making it in the middle of the alert and also out of the standard of the other screens. — **Done (design):** the button was removed from that frame (a workout with exercises no longer offers it, R24) and the limit hint/counter/disabled button were realigned to the standard header-row position; the button now appears only on the zero-exercise frame, in the standard place.
3. We should make the option "usar treino existente como base" disappear whenever the trainer adds the first exercise to the training. This document should be updated with that requirement and mark here as done once it is. — **Done:** R24 (offered on a new workout until its first exercise is added — naming it first keeps the offer; never on an existing workout), R25, E7, E20, and the §7 row "When is 'Usar treino existente como base' offered?".
4. "Modo item a item" should not be a different behaviour of the screen, it should always save the changes with a small delay after the change is made. This document should be updated to reflect that behaviour and mark here as done once it is. — **Done:** the whole editor is now automatic saving — §1, §3, R3–R13 (creation on first save, one footer status, "Concluir" only, leave-warning only mid-save/after failure), R26–R28 (per-change refusal, no separate mode), E15–E18, and the *Superseded* rows in §7.

How this applies (the gate has been passed: the design was updated, reviewed and approved on
2026-09-15 — see the `Design:` line at the top; the steps stay here as the record of the process
and as the rule for any later change to the design):

1. Before writing any code for this feature, update the project's pen.dev design file
   (`Vertice Web.pen` — the same file `.claude/skills/pencil-design-audit` audits against, via the
   `pencil` MCP tools) so it reflects every screen state this PRD introduces: the new, empty
   workout with "Usar treino existente como base" in the header row (R1, R24); a workout with
   exercises, where "Usar treino existente como base" is absent (R24); drag-and-drop reordering
   of exercises and of sets (R15/R16); the cap-reached states (R21/R22) and the picker's
   cap-reached dialog; the refused-change message with the removal undone on screen and the
   blocking exercise/set named (R27/R28); the footer with "Concluir" and its save status in the
   "Salvando…", "Salvo" and "Erro ao salvar — Tentar novamente" states (R9–R11). The
   leave-warning while a save is pending or failed (R12) is the browser's native prompt and is
   not drawn.
2. Tell the owner the design is ready for review.
3. The owner reviews it and, when satisfied, edits the `Design:` line at the top of this
   document to `Design: design-ok`.
4. Only after that line reads `design-ok` may the spec be implemented. If the design review
   changes any rule above, update this PRD first.
