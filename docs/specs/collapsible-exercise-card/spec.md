# Spec: Collapsible Exercise Card (Web)

PRD: [docs/prds/collapsible-exercise-card/prd.md](../../prds/collapsible-exercise-card/prd.md)
(rules `R#`, edge cases `E#`). Workout editor spec:
[docs/specs/create-workout-with-exercises/spec.md](../create-workout-with-exercises/spec.md).
Design: `Vertice Web.pen`, section "Vertice — Editor de treino: cartão de exercício recolhível
(collapsible-exercise-card)" — component **Workout Exercise Card** and its instance-variant
**Workout Exercise Card — Collapsed**, the collapsed states, and three editor screens.

## Scope

Web only. No API, BFF or contract change: collapsing is view state that is never sent anywhere.

## Merge and deploy order

Only `vertice-web-react` changes, so there is no cross-repo order. Rollback is a plain revert of
this repo's PR.

## State: `src/lib/workoutEditor/collapse.ts`

- `CollapsedKeys` is a `ReadonlySet<string>` of exercise `key`s, kept in `WorkoutEditorSession`
  state (`useState`), **never in the draft** (`model.ts`/`reducer.ts`). So it is never autosaved
  and never changes the footer status or the leave warning (R15, E8), and every mount starts
  empty, i.e. all expanded (R7, R8, E9).
- Keyed by the stable `key`, not the position, so a reorder keeps each card's state (R17). A key
  not in the set means expanded, so an added exercise (R9, E2) and the cards seeded by "Usar
  treino existente como base" (R10, fresh keys) start expanded with no bookkeeping. Keys of
  removed exercises may linger in the set; every reader goes through `draft.exercises`, so they
  are inert.
- Pure helpers, unit-tested in `collapse.test.ts`: `setCountLabel` (R3), `toggleCollapsed`,
  `allCollapsed`/`toggleAll` (R13, R14), `expandRefused` (R11).

## Refused removal (R11, E3, E4)

`WorkoutEditorSession` remembers the last `refusal` object it saw and, during render, when a
new one arrives, calls `expandRefused(draft.exercises, collapsed, refusal)`: every card listed in
`refusal.exerciseKeys`, or owning a key in `refusal.setKeys`, leaves the set. This uses React's
"adjust state while rendering" pattern rather than an effect, so the card is never painted
collapsed with a pending refusal.

## Card: `WorkoutExerciseCard`

New props: `collapsed?: boolean` and `onToggleCollapsed?: () => void` (controlled; the button
is rendered only when the handler is given).

- **Toggle (R1):** a borderless ghost button in the header's right group, before the remove
  button: `ChevronUp` + "Ocultar séries" when expanded, `ChevronDown` + "Mostrar séries" when
  collapsed. Primary text color, `surface-hover` background on hover, a primary focus ring on
  `:focus-visible`. `aria-expanded` and `aria-controls` (the body's `useId`). Nothing else on
  the card toggles it (no header click), so drag and links never toggle by accident.
- **Collapsed (R2, R5):** the header only. The rest field is replaced by the set count
  (`List` icon + `setCountLabel`) and, when `notes.trim()` is not empty, a focusable notes icon
  (`MessageSquareText`, `role="img"`, `aria-label="Notas do exercício"`, `tabIndex=0`) inside
  `Tooltip` with the full note, `aria-describedby` pointing at it (R4). The notes field, sets
  table, set-drag hint, "+ Adicionar série" and the set-cap message are **not rendered** (not
  merely hidden), so no field inside is focusable or submitted.
- Drag handle, position, name, muscle groups, "Ver vídeo", the "Arrastando" and the
  "não é possível soltar" tags, the dragging/refused shells and the remove button are shared by
  both looks (R6, R16, R17, E5).
- The toggle keeps its place in the tree across both looks, so keyboard focus stays on it after
  a toggle.

## Editor-wide action (R12–R14, E1)

In the toolbar's actions, before "+ Adicionar exercício": an `outline` `Button` shown only when
`draft.exercises.length >= 2`, reading "Expandir todos" when `allCollapsed` and "Recolher todos"
otherwise; it sets the state to `toggleAll(...)`.

## UI kit: `Tooltip`

Two additive props: `id` (for `aria-describedby`) and `multiline` (wraps at `max-w-[320px]`
instead of `whitespace-nowrap`). It now also opens on `group-focus-within`, not only hover, so
keyboard users get the same content (R4); this benefits every existing use.

## Tests

- Unit: `src/lib/workoutEditor/collapse.test.ts`.
- Storybook (`WorkoutExerciseCard`): `ToggleCollapse`, `Collapsed` (R2, R5, R16),
  `CollapsedNoSets` (E7, E10), `CollapsedAtSetCap` (E6), `CollapsedNotesOnFocus` (R4),
  `CollapsedDragging` (R17).
- Storybook (`WorkoutEditorSession`): `CollapseAndExpandAll` (R7, R12–R15, no transport call),
  `SingleExerciseHasNoCollapseAll` (E1), `RefusedRemovalExpandsCollapsedCard` (R11, E4).
- Storybook (`Tooltip`): `MultilineOnFocus`.
