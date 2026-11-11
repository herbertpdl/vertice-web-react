# PRD: Collapsible Exercise Card (Web)

Status: Draft
Design: design-ok
Owner: hebertpdl@gmail.com
Related: none in `docs/requirements.md` (new requirement from the owner: the exercise card grows
too big as sets are added, forcing the trainer to scroll too much),
[docs/prds/create-workout-with-exercises/prd.md](../create-workout-with-exercises/prd.md) (the
workout editor this changes; its rules are referred to below as `WE-R#`/`WE-E#` and not restated)
Spec: [docs/specs/collapsible-exercise-card/spec.md](../../specs/collapsible-exercise-card/spec.md)

## 1. Summary

In the web workout editor every set adds a full row to its exercise's card, so an exercise with
several sets takes a lot of the screen, and a workout with a few such exercises makes the trainer
scroll a long way to reach, compare or reorder exercises. This change lets the trainer collapse an
exercise card into a compact version that still shows what identifies the exercise and how many
sets it has, and expand it again to edit. Collapsing is only a way of viewing the editor: it never
changes the workout and the client sees nothing different.

## 2. Actors

- **Trainer**: can collapse and expand each exercise card, and collapse or expand all of them at
  once, while editing a workout. Can reorder and remove exercises from collapsed cards. Cannot edit
  sets, notes or rest between sets on a collapsed card (they are not shown there).
- **Client**: not involved; nothing changes for the client (R16).

## 3. Flows

**Trainer collapses exercises to get an overview**

1. The trainer opens a workout in the editor; every exercise card is expanded.
2. The trainer presses "Ocultar séries" on an exercise card; that card collapses to its compact
   version.
3. With two or more exercises, the trainer presses "Recolher todos"; every card collapses and the
   action now reads "Expandir todos".
4. The trainer drags a collapsed card to a new position, or removes an exercise, as on an expanded
   card.
5. The trainer presses "Mostrar séries" on the exercise they want to edit; that card expands and
   its sets can be edited as today.

## 4. Rules

**The collapsed card**

- R1: Each exercise card has a button that collapses and expands it, reading "Ocultar séries" while
  the card is expanded and "Mostrar séries" while it is collapsed; no other part of the card
  collapses or expands it.
- R2: A collapsed card shows the exercise's position, its drag handle, its name, its muscle groups,
  the "Ver vídeo" link when the exercise has a video, the number of sets, a notes icon when the
  exercise has notes, the remove button and the collapse/expand button.
- R3: The number of sets reads "1 série" for one set, "N séries" for more than one, and "Nenhuma
  série" for none, with no extra mention of the 10-set limit.
- R4: Hovering over or keyboard-focusing the notes icon shows the exercise's full note text.
- R5: A collapsed card does not show the notes box, the sets, the rest between sets, "+ Adicionar
  série" or the set-limit message.
- R6: The collapsed card is a second look of the same exercise card, in the editor and in the
  design file, not a separate element.

**When cards are collapsed or expanded**

- R7: When the editor opens, for a new or an existing workout, every exercise card is expanded.
- R8: Which cards are collapsed is not remembered: leaving the editor or reloading the page brings
  every card back expanded.
- R9: A newly added exercise's card starts expanded, and every other card keeps its state.
- R10: The exercise cards filled in by "Usar treino existente como base" (WE-R25) start expanded.
- R11: When a removal is refused because a client has recorded data against it (WE-R27) and the
  affected card is collapsed, that card expands.

**Collapse all / expand all**

- R12: When the workout has two or more exercises, the editor shows one editor-wide action, and it
  is hidden otherwise.
- R13: While any card is expanded, the editor-wide action reads "Recolher todos" and collapses
  every card.
- R14: While every card is collapsed, the editor-wide action reads "Expandir todos" and expands
  every card.

**Everything else stays the same**

- R15: Collapsing or expanding a card is never saved: it does not change the footer's save status
  (WE-R9) and does not trigger the warning on leaving the editor (WE-R12).
- R16: Removing an exercise from a collapsed card works exactly as from an expanded one.
- R17: A collapsed card can be dragged to reorder exercises exactly like an expanded one (WE-R15),
  and dragging any card does not change whether any card is collapsed.
- R18: Nothing changes in how a client views or performs a workout.

## 5. Edge cases

| # | Scenario | Expected outcome | Rule |
|---|---|---|---|
| E1 | Removals leave the workout with a single exercise. | The editor-wide action disappears; the remaining card keeps its state and can still be toggled on its own. | R1, R12 |
| E2 | Every card is collapsed and the trainer adds an exercise. | The new card is expanded; the editor-wide action now reads "Recolher todos". | R9, R13 |
| E3 | The trainer removes an exercise from its collapsed card and the removal is refused (a client recorded data). | The exercise comes back on screen expanded, with the same message as today (WE-R27/WE-R28). | R11, R16 |
| E4 | The trainer removes a set of an expanded card, collapses the card before the save, and the removal is refused. | The set comes back and the card expands, with the same message as today. | R11 |
| E5 | The trainer drags a set from one exercise over a collapsed card. | It cannot be dropped there, the same as today for any other exercise (WE-R16). | R17 |
| E6 | A collapsed exercise has 10 sets. | It reads "10 séries", with no limit hint. | R3 |
| E7 | A collapsed exercise has no sets. | It reads "Nenhuma série". | R3 |
| E8 | The trainer collapses a card while the footer shows "Salvando…". | The save carries on; the save status is unaffected by the collapse. | R15 |
| E9 | The trainer reloads the page with some cards collapsed. | Every card comes back expanded. | R7, R8 |
| E10 | The exercise has no notes or no video. | No notes icon or no "Ver vídeo" link on the collapsed card. | R2 |

## 6. Out of scope

- The client's mobile app: nothing changes in how a client sees or performs a workout.
- Workout and exercise lists on other screens (plan detail page, student screens): they keep their
  current display.
- Collapsing individual sets: only the whole exercise card collapses.
- A summary of the sets (reps, duration, weight) on the collapsed card: not wanted for now; may
  come later.
- Remembering which cards were collapsed between visits.

## 7. Decisions

| Question | Decision | Why |
|---|---|---|
| What does a collapsed card show besides name, position and drag handle? | Set count, muscle groups, "Ver vídeo", notes icon, remove button. No set summary, no rest between sets. | Owner's choice in the interview. |
| How do cards start when the editor opens? | All expanded. (proposed, accepted) | Same as today; no surprises. |
| Is the collapsed state remembered? | No, it resets on every visit. (proposed, accepted) | Collapsing is a momentary viewing aid. |
| Is there a collapse-all action? | Yes, one action that switches between "Recolher todos" and "Expandir todos". (proposed, accepted) | Most useful right before reordering. |
| When is the collapse-all action shown? | Only with two or more exercises. | Owner's choice: with one card it duplicates the card's own button. |
| How does a single card toggle? | Only through its own button. (proposed, accepted) | No accidental toggles while dragging or clicking links. |
| Wording of the card's button | "Ocultar séries" / "Mostrar séries". | Owner's choice over "Recolher/Expandir exercício". |
| Wording of the editor-wide action | "Recolher todos" / "Expandir todos", not matched to the card's wording. | Owner's choice. |
| A new exercise is added | Its card starts expanded; others keep their state. (proposed, accepted) | The trainer usually adds sets right after adding an exercise. |
| A removal is refused on a collapsed card | The card expands. (proposed, accepted) | The restored item and the refusal must be visible. |
| Remove from a collapsed card | Allowed, same as expanded. (proposed, accepted) | Removing needs no set details. |
| Dragging an expanded card | Nothing collapses automatically. (proposed, accepted) | Predictable; "Recolher todos" exists for a compact list. |
| Notes on a collapsed card | Icon, with the full text on hover or focus. (proposed, accepted) | Signals notes exist without taking space. |
| Set count wording | "1 série" / "N séries" / "Nenhuma série", no limit hint. (proposed, accepted) | Plain and short. |
| Cards from "Usar treino existente como base" | Start expanded. (proposed, accepted) | Consistent with opening a workout. |

## 8. Open questions

None.

## 10. Design gate (stated by the owner)

The owner confirmed the same gate as
[create-workout-with-exercises](../create-workout-with-exercises/prd.md) §10 applies here:
"before implementing, the agent should go to the pen.dev where the design files for the project are
at and implement all the changes on the design first, and only go for the implementation after I
check a new design status flag on the document as `design-ok`."

1. Before writing any code, update `Vertice Web.pen` (via the `pencil` MCP tools) so the exercise
   card has a collapsed variant of the same component, covering: collapsed with sets, with no sets
   ("Nenhuma série"), with and without notes icon and video link, the notes text on hover (R4),
   being dragged (R17), and the button labels "Ocultar séries" / "Mostrar séries" (R1). Update the
   workout editor screen with a mix of collapsed and expanded cards and the editor-wide action in
   both its "Recolher todos" and "Expandir todos" states (R12–R14).
2. Tell the owner the design is ready for review.
3. The owner reviews it and, when satisfied, changes the `Design:` line at the top of this document
   to `Design: design-ok`.
4. Only after that line reads `design-ok` may the feature be implemented. If the design review
   changes any rule above, update this PRD first.
