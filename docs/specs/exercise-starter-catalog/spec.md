# Spec: Starter exercise catalog (Web)

Status: Draft
Design: pending — no web PRD exists for this slug, so this line lives here (brief D14). It blocks
every PR in §8 that renders new or changed UI (PR1–PR5: the `MultiSelect` control, multi-group
pills, the ownership-gated row, the group filter, the in-use delete refusal, the picker's
loading/error states). Nothing in this feature is exempt: the `Exercise` shape change forces the
consumer screens to change in the same PR that changes the types (§0, "no lib-only PR"), so no
PR here touches only `src/lib`. Flip to `design-ok` once `Vertice Web.pen` has the frames named
in §5 and the owner has reviewed them.
Owner: hebertpdl@gmail.com
Related: [vertice-api/docs/prds/exercise-starter-catalog/prd.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/exercise-starter-catalog/prd.md)
(source PRD — rules R1–R59, edge cases E1–E23, decisions §7; not restated here; no web PRD exists),
[vertice-bff/docs/specs/exercise-starter-catalog/spec.md](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/exercise-starter-catalog/spec.md)
and [vertice-bff/docs/api-contract.md](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
(the endpoints consumed here — **not on vertice-bff `main` yet**, written in the same run against
the same contract brief; until they merge, the contract is the brief's REST section, reproduced
verbatim in §1), [vertice-api/docs/specs/exercise-starter-catalog/spec.md](https://github.com/herbertpdl/vertice-api/blob/main/docs/specs/exercise-starter-catalog/spec.md)
(**not on `main` yet**; upstream semantics of visibility, ordering and the two refusals),
[docs/assessments/exercise-starter-catalog/assessment.md](../../assessments/exercise-starter-catalog/assessment.md)
(findings F1–F17, coverage map, §9 inputs), pen.dev design `Vertice Web.pen` — frames to add
(none exist yet): `Exercícios — filtro por grupo`, `Exercício — múltiplos grupos`,
`Exercício — não pode excluir (em uso)`, `Adicionar exercício — filtro por grupo` (§5).

The web adds no route and no state engine. It reshapes two existing screens — the `/exercicios`
catalog and the workout editor's "Adicionar exercício" picker — and the `ExerciseDialog` create/
edit form so that an exercise carries a list of muscle groups (from `GET /muscle-groups`, never a
hardcoded list), the list is narrowed and searched server-side, a starter-set row offers no edit
or delete action, and a delete refused because a workout uses the exercise is explained in the
dialog. Every rule with teeth is upstream: visibility and ownership scoping (R13–R16, R32, R36),
the starter-set refusals (R26/R27), the in-use delete refusal (R34), ordering (R48–R50) and the
"at least one group" rule (R31/R40) are enforced by vertice-api and surfaced by vertice-bff; the
web makes the contract calls in §1, renders what comes back in the order it comes back, hides
the affordances R28 says it must not offer, and mirrors exactly one validation (at least one
group) for immediate feedback.

## 0. Scope decisions

Every decision below that cites a brief `D*` is **assumed in the absence of the owner; the
assessment's recommendation** where one existed, otherwise the orchestrator's best judgment. The
hand-over lists them for the owner to overturn before implementation starts.

- **Design gate (D14, F1, Q2) — `Design: pending` in this header; blocks PR1–PR5.** No web PRD
  carries the line, so the spec does. The four frames named in the header are the states the
  assessment identified (multi-select, group filter, ownership-gated row, in-use delete error)
  plus the picker's loading/error states that F17 fixes. Cost: nothing in §8 can merge until the
  owner flips the line; the `MultiSelect` PR can be built and reviewed in Storybook while the
  API and BFF land, and is the natural vehicle for the design review of the control. Assumed.
- **No lib-only, non-gated PR exists — and that is stated rather than faked.** The brief expects
  "API client + types + validation" to ship ungated. It cannot here: `Exercise.muscleGroup`
  (string enum) becomes `muscleGroups: {id,name}[]` + `isStarter`, and `muscleGroupLabels` goes
  away, so `npm run build` fails on every consumer (`page.tsx`, both dialogs,
  `WorkoutExerciseCard`, `storyFixtures.ts`, `autosave.test.ts`) unless they change in the same
  PR. Keeping the old field alongside the new one would make the types lie (the BFF stops
  sending `muscleGroup`). So PR2 is "switch the web to the new contract" — lib plus the smallest
  consumer edits that keep `main` building — and it renders the multi-group pills and the
  `MultiSelect`, hence it is gated. Cost: one larger PR (~250 hand-written lines) instead of a
  lib-only one; benefit: `main` builds after every merge (pr-breakdown.md).
- **Muscle groups come from `GET /muscle-groups` (D6, F9, F14); the `MuscleGroup` string union,
  `muscleGroupSchema` and `muscleGroupLabels` are deleted.** Ids are database-generated, so a
  static list would have to hardcode ids too. Query key `["muscleGroups"]`, `staleTime:
  Infinity` (reference data the platform team changes rarely; a hard reload refreshes it). Names
  arrive in pt-BR from the seed (R8/R9), so there is no label map to maintain. Assumed.
- **Multi-select control: new `src/components/ui/MultiSelect` (D13, F7, assessment §5 option
  B), not a mode on `Dropdown`.** Widening `Dropdown.value` to `string | string[]` would touch
  every single-select caller (day-of-week, set strategy, the new group filter). `MultiSelect`
  copies `Dropdown`'s portal/`fixed`/flip/`z-[60]`/Escape-`preventDefault` mechanics
  (≈40 lines). **The positioning logic is not extracted into a shared hook in this feature**:
  D13 allows it only if `Dropdown` adopts it without behavior change, and `Dropdown` is a
  Pencil-generated design-system component whose parity audit would have to be re-run for a
  refactor with one new consumer. Cost: duplicated positioning code, listed in §7 as a follow-up.
  Assumed.
- **Starter-set rows: no badge, no marker; the pencil (and the dialog's Excluir) exist only for
  `isStarter === false` (D15, F1a, R28) — settled in the assessment's Q1, not reopened.** The
  gate is the row: `ExerciseRow` renders the "Editar exercício" button only for the trainer's own
  exercise and a same-width spacer otherwise, so `ExerciseDialog` is never opened for a starter
  exercise. The dialog itself does **not** re-check `isStarter` — one gate, one place, and the
  server refuses anyway (403 → generic root error, D16).
- **Filtering and search are server-side (D17, F8); the client no longer filters or sorts.**
  `useQuery({ queryKey: exercisesQueryKey({ muscleGroupId, q }), queryFn })` with the key
  normalized to `["exercises", { muscleGroupId: number | null, q: string }]` so
  `invalidateQueries({ queryKey: ["exercises"] })` still covers every filter combination. The
  search box is debounced **300 ms** (`useDebouncedValue`) — long enough to swallow a burst of
  keystrokes at the BFF, short enough not to feel laggy; `placeholderData: keepPreviousData`
  keeps the previous rows on screen while the next page loads, so the skeleton shows only on the
  first load. R48–R50's ordering is therefore whatever the array order is. Cost: one request per
  settled keystroke burst. Assumed.
- **Catalog errors: inline, never `useRedirectOnError` (D16, F11).** The catalog is a list, not a
  detail page: a failed list query renders "Não foi possível carregar os exercícios" with
  "Tentar novamente" (`refetch()`). 403 on the list (a CLIENT at the BFF gate) cannot happen from
  a trainer-only UI and falls into the same state. The muscle-group query failing degrades the
  filter (disabled, "Grupos indisponíveis") and the forms' `MultiSelect` (disabled with the error
  line "Não foi possível carregar os grupos musculares" and a "Tentar novamente" link) without
  hiding the list. Assumed.
- **In-use delete refusal (D4, D16, F12, R34/E5): `ApiError.code === "PRECONDITION_FAILED"` on
  delete renders a refusal block, not the generic root error.** Same key as the workout editor
  (code, not status — 409 is also `CONFLICT`). The block follows the editor's refusal banner
  (danger border, `TriangleAlert`, title + body) so it is visually distinct from field
  validation. It shows only its pt-BR title and body: the upstream `message` is English and is
  **not** rendered (owner review, 2026-09-23 — the screen must not show English text). The dialog
  stays open so the trainer can Cancelar.
- **Submit stays disabled until the form is valid (owner review, 2026-09-23).** Every form in
  scope — `ExerciseDialog` create and edit, and `AddExerciseDialog`'s create mode — disables its
  submit button ("Criar exercício", "Salvar alterações", "Criar e adicionar") while
  `exerciseSchema` fails: blank name, no muscle group, or a non-empty invalid video URL. The form
  runs `mode: "onChange"` and the button is `disabled={!formState.isValid}` (plus the existing
  `atCap` in the picker). While the groups fail to load, the form is invalid, so the button is
  disabled too.
- **Exactly one rule is mirrored client-side: "at least one muscle group" (R31/R40, E13/E22,
  F10).** `exerciseSchema.muscleGroupIds` is `z.array(z.number().int().positive()).min(1,
  "Selecione pelo menos um grupo muscular")`; the server enforces it too. Everything else — name
  uniqueness (R44, none), ownership (R32/R36), starter-set immutability (R26/R27), in-use delete
  (R34) — is **not** checked in the browser; verification greps for it. The search input's
  `maxLength={100}` mirrors the BFF's `q` bound as an input constraint, not a rule.
- **The trainer may edit every field of their own exercise (D11, R30/R31).** `ExerciseDialog`'s
  edit mode replaces name, description, video URL and the whole group list via `PATCH` (full
  replacement, as today). Assumed, as the PRD's §8 instructs the spec author to assume.
- **`/exercicios` follows the repo convention it skipped: server `page.tsx` + client
  `ExerciciosContent.tsx`.** Today the page is a `"use client"` `page.tsx`. Since it is
  rewritten anyway (filter, server-side search, error state, ownership gate), it gets the
  `alunos` shape (`metadata`, `<Suspense>`, `*Content.tsx`). Cost: file move noise in PR3.
- **Filter and search state is local component state, not URL search params.** Nothing links
  into a filtered catalog and the picker lives in a dialog; `AlunosContent` keeps its filter
  local too. Cost: a reload clears the filter.
- **`AddExerciseDialog`'s loading gap (F17) is fixed in the same pass (PR5).** `isPending` →
  `ListRowSkeleton`s; the "Não encontrou o exercício?" prompt renders only for a settled, empty
  result. The two-mode `useState` shape stays (F13); no state engine.
- **Increment 2 (R17–R19) needs no web change (brief).** The picker only ever offers ids the
  scoped list returned; `CloneWorkoutDialog` does not call `POST /workouts/:id/clone` (F2). Not
  built.
- **Client-side screens (R20–R24, E7, E16, E17) have no web surface (F3).** Not built.
- **Story-injectable API (`api` prop) on `ExerciseDialog`, following `WorkoutEditorSession`'s
  `transport` prop.** The 409 state cannot be reached in Storybook without it (no BFF, no msw in
  `package.json`). `storyQuery.tsx`'s `withSeededQueries` gains `pending`/`failing` seeds so the
  picker's loading and error states are stories too.
- **Upstream is unshipped (F4, Blocker).** Every PR after PR1 names the BFF endpoints it needs
  on vertice-bff `main` (§8). Deploy is the D9 coordinated window api → bff → web; between PR2's
  merge and that deploy, `main` builds and its stories pass but the app is not deployable against
  the old BFF (`muscleGroups` undefined). Accepted per D9 ("blast radius is one client").

## 1. Endpoints consumed

Verbatim from the contract brief's REST section. Browser requests go through the Next proxy, so
the network tab shows `/api/bff/<path>`; the BFF receives `/api/<path>` with the same query
string and body.

| `METHOD path` | Used by | Query key / mutation | Invalidates |
|---|---|---|---|
| `GET /muscle-groups` → `200 MuscleGroup[]` (id order, 14 at launch) | `ExerciciosContent` (filter options), `ExerciseDialog` and `AddExerciseDialog` (`MultiSelect` options, picker filter) | `useQuery(["muscleGroups"])`, `staleTime: Infinity` | — |
| `GET /exercises?muscleGroupId=&q=` → `200 Exercise[]` (upstream order; `muscleGroupId` optional positive int, `q` optional 1..100 trimmed, both omitted when unset) | `ExerciciosContent`, `AddExerciseDialog` (search mode) | `useQuery(exercisesQueryKey({ muscleGroupId, q }))` = `["exercises", { muscleGroupId: number \| null, q: string }]`, `placeholderData: keepPreviousData` | — |
| `POST /exercises` `{name, description, videoUrl?, muscleGroupIds}` → `201 Exercise` (`isStarter: false`) | `ExerciseDialog` (create), `AddExerciseDialog` ("Criar novo") | `useMutation(createExercise)` | `["exercises"]` (prefix → every filter combination) |
| `PATCH /exercises/:id` same body → `200 Exercise` | `ExerciseDialog` (edit) | `useMutation(updateExercise)` | `["exercises"]`; also `["workout", *, "full"]` is **not** invalidated — the editor re-fetches on open and renames apply upstream (R33) |
| `DELETE /exercises/:id` → `204` | `ExerciseDialog` (Excluir) | `useMutation(deleteExercise)` | `["exercises"]` |
| `GET /workouts/:id/full`, `POST /training-plans/:planId/workouts`, `PUT /workouts/:workoutId/exercises` (composed; every `FullWorkoutExercise.exercise` is the new `Exercise` shape) | workout editor (unchanged calls) | unchanged (`["workout", id, "full"]`) | unchanged |

Unchanged and still consumed as today: `GET /exercises/:id` (`fetchExercise`, no screen calls
it), `GET /exercises/:id/progress` (student progress tab).

Shared types (brief, verbatim): `MuscleGroup = { id: number, name: string }`;
`Exercise = { id: number, name: string, description: string, videoUrl: string, muscleGroups:
MuscleGroup[], isStarter: boolean }` (`muscleGroups` order as upstream: primary first — starter rows only; a trainer's own exercise has no primary group, so its groups arrive in id order — owner, 2026-09-23);
`ExerciseInput = { name: string, description?: string, videoUrl?: string, muscleGroupIds:
number[] }`. The web always sends `description` (`""` when empty) and `videoUrl` (`""` when
empty), as it does today.

`error.code`s each screen handles:

| Screen | Code (status) | Handling |
|---|---|---|
| `ExerciciosContent` list, `AddExerciseDialog` list | any failure of `GET /exercises` — `VALIDATION_ERROR` (400, bad query), `FORBIDDEN` (403, unreachable for a trainer), `NOT_FOUND` (404, unknown `muscleGroupId` — unreachable, ids come from `GET /muscle-groups`), network | Inline error state with "Tentar novamente" → `refetch()`. Never `useRedirectOnError` (D16). |
| same | any failure of `GET /muscle-groups` | Filter `Dropdown` disabled with placeholder "Grupos indisponíveis"; the list still loads. |
| `ExerciseDialog`, `AddExerciseDialog` create form | any failure of `GET /muscle-groups` | `MultiSelect` disabled, error line "Não foi possível carregar os grupos musculares" + "Tentar novamente" link (`refetch()`). |
| `ExerciseDialog` save, `AddExerciseDialog` create | `VALIDATION_ERROR` (400) | Root error box with the fixed pt-BR text "Não foi possível salvar o exercício" — `error.message` (English, from the BFF or upstream) is never rendered (owner, 2026-09-23); the disabled submit normally prevents it. |
| `ExerciseDialog` save/delete | `FORBIDDEN` (403 — starter-set or another trainer's exercise; unreachable through the UI, R28) | Generic root error box with the fixed pt-BR text ("Não foi possível salvar o exercício" / "Não foi possível excluir o exercício"); `error.message` is not rendered. |
| `ExerciseDialog` save/delete | `NOT_FOUND` (404 — deleted meanwhile) | Same fixed pt-BR root error box. |
| `ExerciseDialog` delete | `PRECONDITION_FAILED` (409) — message `Exercise <id> is used by a workout and cannot be deleted` | Refusal block (§5) with pt-BR title and body only (the English upstream message is not shown), dialog stays open. |
| every call | `UNAUTHENTICATED`/401 | `apiClient` logs out and hard-navigates to `/login` (existing). |

## 2. Files

| Path | Role |
|---|---|
| `src/lib/api/types.ts` | `MuscleGroup` becomes `{ id: number; name: string }` (the string union is deleted); `Exercise` gains `muscleGroups: MuscleGroup[]`, `isStarter: boolean`, loses `muscleGroup` |
| `src/lib/api/muscleGroups.ts` (new) | `fetchMuscleGroups(): Promise<MuscleGroup[]>` → `GET /muscle-groups`; one module per BFF resource |
| `src/lib/api/exercises.ts` | `ExerciseListParams { muscleGroupId?: number; q?: string }`; `exercisesQueryKey(params)` (normalized key); `fetchExercises(params = {})` passing `muscleGroupId` and `q` only when set (`q` trimmed, `""` → omitted); `ExerciseInput` reshaped to `muscleGroupIds: number[]` |
| `src/lib/validation/exercises.ts` | `muscleGroupSchema`/`muscleGroupLabels` deleted; `exerciseSchema.muscleGroupIds` array `.min(1, "Selecione pelo menos um grupo muscular")`; `ExerciseFormInput` follows |
| `src/lib/validation/exercises.test.ts` (new) | `unit`-project test for the schema (§6) |
| `src/lib/hooks/useDebouncedValue.ts` (new) | `useDebouncedValue<T>(value, delayMs = 300)`; shared by the catalog and the picker |
| `src/components/ui/MultiSelect/MultiSelect.tsx`, `MultiSelect.stories.tsx`, `index.ts` (new); `src/components/ui/index.ts` | Multi-value listbox popover (§4); re-exported from the kit |
| `src/components/domain/ExerciseRow/ExerciseRow.tsx`, `ExerciseRow.stories.tsx`, `index.ts` (new) | One catalog row: name, group pills, description, video link, pencil only when `!isStarter`; exports `EXERCISE_COLUMN_WIDTHS` for the header |
| `src/components/domain/ExerciseDialog/ExerciseDialog.tsx`, `ExerciseDialog.stories.tsx` (new) | `MultiSelect` for `muscleGroupIds`, groups from `["muscleGroups"]`, `api` story hook, 409 refusal block |
| `src/components/domain/AddExerciseDialog/AddExerciseDialog.tsx`, `.stories.tsx` | Group filter + debounced server-side search in search mode, loading/empty/error states, `MultiSelect` in create mode, multi-group pills |
| `src/components/domain/WorkoutExerciseCard/WorkoutExerciseCard.tsx`, `.stories.tsx` | Renders one pill per `exercise.exercise.muscleGroups[]` (primary first) instead of `muscleGroupLabels[...]` |
| `src/components/domain/storyFixtures.ts` | `Exercise` fixtures carry `muscleGroups`/`isStarter`; new `muscleGroups` (14) and `remadaPropria` (own, `isStarter: false`) fixtures |
| `src/components/domain/storyQuery.tsx` | `withSeededQueries(seed, { pending?, failing? })`: never-resolving and rejected seeds; `retryOnMount: false` |
| `src/components/domain/WorkoutEditor/WorkoutEditorSession.stories.tsx` | Seed keys updated to `exercisesQueryKey({})` and `["muscleGroups"]` (no component change) |
| `src/lib/workoutEditor/autosave.test.ts` | Fixture lines 7–8 only: `muscleGroups`/`isStarter` instead of `muscleGroup` — the engine is untouched |
| `src/app/(app)/exercicios/page.tsx` | Becomes the server page (`metadata` title "Exercícios — Vertice", `<Suspense><ExerciciosContent /></Suspense>`) |
| `src/app/(app)/exercicios/ExerciciosContent.tsx` (new) | The client screen: filter, search, list states, dialogs |

Untouched on purpose (verified by `git diff main --stat` in verification.md): `src/lib/workoutEditor/{model,reducer,autosave,useWorkoutAutosave}.ts`, `src/components/ui/Dropdown/*`, `src/lib/hooks/useRedirectOnError.ts`, `src/lib/api/client.ts`, `src/app/api/**`, `src/components/domain/CloneWorkoutDialog/*`, `src/components/domain/WorkoutEditor/WorkoutEditor.tsx`.

## 3. Routes and navigation

No route is added or changed. `/exercicios` keeps its path and its header link; it is reached
from `AppHeader`'s nav as today. The picker is reached from the editor's "+ Adicionar exercício"
(`WorkoutEditor.tsx:441`), unchanged. No redirects: the catalog never bounces (D16).

## 4. State and data flow

Plain forms and two queries; no engine.

**Catalog (`ExerciciosContent`).**
- Local state: `muscleGroupId: number | null` (filter), `search: string` (input), `dialogOpen`,
  `editingExercise: Exercise | null` (as today).
- `const q = useDebouncedValue(search.trim(), 300)`.
- `groups = useQuery({ queryKey: ["muscleGroups"], queryFn: fetchMuscleGroups, staleTime: Infinity })`.
- `list = useQuery({ queryKey: exercisesQueryKey({ muscleGroupId, q }), queryFn: () => fetchExercises({ muscleGroupId, q }), placeholderData: keepPreviousData })`.
- Filter `Dropdown` options: `[{ value: "", label: "Todos os grupos" }, ...groups.map(g => ({ value: String(g.id), label: g.name }))]`; `onChange` → `setMuscleGroupId(value ? Number(value) : null)`.
- Rows render `list.data` in array order — no `filter`, `sort` or `useMemo` over it.
- Row pencil → `setEditingExercise(exercise)` only exists for `!exercise.isStarter` (`ExerciseRow`).
- `exercisesQueryKey` normalization: `{ muscleGroupId: params.muscleGroupId ?? null, q: (params.q ?? "").trim() }` — so stories seed `'["exercises",{"muscleGroupId":null,"q":""}]'` and the same key is produced by both screens for the unfiltered list.
- `fetchExercises` request: `apiClient.get<Exercise[]>("/exercises", { muscleGroupId: params.muscleGroupId ?? undefined, q: q || undefined })` — `apiClient` drops `undefined`, so the unfiltered request has **no** query string and a filtered one is `?muscleGroupId=1&q=supino` (this key order; `URLSearchParams` encodes spaces as `+`).

**`ExerciseDialog` form** (`react-hook-form` + `zodResolver(exerciseSchema)`):
- Fields and defaults: `name` (`exercise?.name ?? ""`), `muscleGroupIds` (`exercise?.muscleGroups.map(g => g.id) ?? []`), `description` (`?? ""`), `videoUrl` (`?? ""`).
- `useForm({ mode: "onChange", resolver: zodResolver(exerciseSchema), … })`; the submit button is `disabled={!isValid}` (`formState.isValid`), so an invalid form can never be submitted.
- `MultiSelect value={muscleGroupIds.map(String)} onChange={ids => setValue("muscleGroupIds", ids.map(Number), { shouldValidate: true, shouldTouch: true })}` — the "at least one group" error shows once the trainer has touched the control and left it empty (e.g. unchecked every group), and clears as soon as a group is picked; an untouched empty create form shows no error, only the disabled button.
- Submit → `createExercise(data)` or `updateExercise(exercise.id, data)` with body `{ name, description, videoUrl, muscleGroupIds }`; success → `invalidateQueries({ queryKey: ["exercises"] })`, `onCreated?.(result)`, `onClose()`.
- Delete → `deleteExercise(exercise.id)`; success → invalidate `["exercises"]`, close; `onError`: `error instanceof ApiError && error.code === "PRECONDITION_FAILED"` → `setRefusal(true)` (local state rendering the refusal block; cleared on the next Excluir click; `error.message` is not rendered), else `setError("root", { message: "Não foi possível excluir o exercício" })`. Save's `onError` likewise always sets "Não foi possível salvar o exercício" (create in `AddExerciseDialog`: "Não foi possível criar o exercício"); no `ApiError.message` reaches the screen.
- `api?: { create, update, remove }` prop defaults to the real `src/lib/api/exercises` functions; stories pass fakes.

**`AddExerciseDialog`.** Same two queries and the same key helper as the catalog (so a list the
catalog just loaded is served from cache in the picker and vice versa); local `muscleGroupId`,
`search`, `mode`. Create mode is the same form as `ExerciseDialog` (schema, `MultiSelect`,
`muscleGroupIds`), success → invalidate `["exercises"]` then `pick(exercise)` as today.

**`MultiSelect`** (`src/components/ui/MultiSelect`):
- Props: `label?`, `placeholder?` (default "Selecione…"), `options: { value: string; label: string }[]`,
  `value: string[]`, `onChange: (value: string[]) => void`, `disabled?`, `error?: string`, `className?`.
- Trigger: `<button aria-haspopup="listbox" aria-expanded>`; text = labels of the selected
  options **in option order** joined by ", " (single line, truncated), or the placeholder in the
  tertiary color. Danger border when `error` is set; the error renders under the trigger in the
  same style as `TextField`'s error line.
- Menu: portaled to `document.body`, `position: fixed` from the trigger's
  `getBoundingClientRect()` in a `useLayoutEffect`, re-measured on `resize` and capture-phase
  `scroll`, flips above when there is no room below, `z-[60]`; `role="listbox"
  aria-multiselectable="true"`, options `role="option" aria-selected` with a 20 px check box
  (same visual as `Checkbox`'s box, no nested `<input>`). Click or Space/Enter **toggles** the
  option and keeps the menu open; `onChange` receives the new array in option order. ArrowUp/
  ArrowDown/Home/End move focus (as `Dropdown`); Tab closes and returns focus to the trigger;
  Escape closes with `event.preventDefault()` + `stopPropagation()` so an enclosing `Dialog`
  stays open; outside `pointerdown` closes.

**Debounce.** `useDebouncedValue` returns the last value that stayed unchanged for `delayMs`;
the immediate input state drives the text box, the debounced one drives the query key.

## 5. UI states

Copy is pt-BR and exact. Frames are the ones to add to `Vertice Web.pen` (none exist today);
until they do, the existing frames for `/exercicios`, the exercise dialog and the picker are the
visual baseline and only the states below are new.

### 5.1 `/exercicios` — frame `Exercícios — filtro por grupo`

- Header: "Catálogo de exercícios"; subtitle `{n} exercícios no catálogo` when no filter/search
  is active, `{n} exercícios encontrados` when one is (singular: "1 exercício no catálogo" /
  "1 exercício encontrado"); blank while the first load is pending. Primary button "Novo
  exercício".
- Toolbar: search `TextField` (340 px, placeholder **"Buscar por nome..."** — the old "ou grupo
  muscular" is gone because search is name-only upstream, R46; `maxLength={100}`) and the group
  filter `Dropdown` (240 px, no label, trigger text "Todos os grupos" by default, options = the
  14 group names in id order). Muscle groups failing to load: the `Dropdown` is `disabled` with
  placeholder **"Grupos indisponíveis"**.
- Loading (first load, `isPending`): 5 `TableRowSkeleton`s. Refetch for a new filter/search:
  previous rows stay (`keepPreviousData`), no skeleton.
- Row (`ExerciseRow`): name; one pill per group in `muscleGroups` order (primary first); description;
  video `CirclePlay` link or "—"; the "Editar exercício" pencil **only for `isStarter === false`**,
  an empty same-width cell otherwise (D15). No badge on either kind of row.
- Empty (settled, 0 rows): "Nenhum exercício encontrado" / **"Ajuste a busca ou o filtro de grupo
  muscular, ou cadastre um novo exercício."**
- Error (`isError`, no data): **"Não foi possível carregar os exercícios"** / "Verifique sua
  conexão e tente novamente." + outline button **"Tentar novamente"** (`refetch()`), inside the
  table shell where rows would be. With stale data present and a failed refetch, the stale rows
  stay and the same message shows as a one-line banner above them.

### 5.2 `ExerciseDialog` — frame `Exercício — múltiplos grupos`

- Title "Novo exercício" / "Editar exercício" (unchanged). Fields: "Nome do exercício"
  (placeholder "Supino Reto com Barra"), **"Grupos musculares"** `MultiSelect` (placeholder
  **"Selecione os grupos"**), "Descrição", "URL do vídeo (opcional)". Footer: "Excluir" (danger,
  edit only — and edit is only ever opened for the trainer's own exercise), "Cancelar", "Criar
  exercício" / "Salvar alterações".
- `MultiSelect` open: check-box options in id order, selected ones checked; trigger shows
  "Peito, Tríceps".
- Submit button ("Criar exercício" / "Salvar alterações") disabled while the form is invalid —
  empty create form, blank name, no group, invalid video URL; enabled for a valid form.
- Validation, with every group unchecked: **"Selecione pelo menos um grupo muscular"** under the
  control, danger border, submit disabled; no request can be sent (R40/E13, R31/E22).
- Groups failing to load: `MultiSelect` disabled, line **"Não foi possível carregar os grupos
  musculares"** with link **"Tentar novamente"**.
- Save failure (400/403/404/network): root error box (existing style) with the fixed text
  **"Não foi possível salvar o exercício"** — never the server's `error.message`, which is
  English (owner, 2026-09-23).

### 5.3 `ExerciseDialog` — frame `Exercício — não pode excluir (em uso)`

- After Excluir → 409 `PRECONDITION_FAILED`: a `role="alert"` block above the fields, danger
  border + `TriangleAlert` (the editor's refusal banner style, not the flat root-error box):
  title **"Não é possível excluir este exercício"**, body **"Um treino usa este exercício. Remova-o
  dos treinos antes de excluí-lo."** No detail line: the upstream message is English and is not
  shown. The form stays editable;
  Excluir stays enabled (a second click re-tries and re-renders the block).
- Delete failure with any other code: root error box with the fixed text **"Não foi possível
  excluir o exercício"** — never the server's `error.message`.

### 5.4 `AddExerciseDialog` — frame `Adicionar exercício — filtro por grupo`

- Search mode: search `TextField` (placeholder "Buscar exercício por nome...", unchanged,
  `maxLength={100}`) and, on the same row, the group filter `Dropdown` (`size="compact"`, 180 px,
  "Todos os grupos"). Rows: name, one pill per group, video icon, description; "Adicionar".
- Loading (first load): 4 `ListRowSkeleton`s (F17 — the empty prompt must not flash).
- Empty (settled): "Não encontrou o exercício? Criar novo →" (unchanged copy).
- Error: **"Não foi possível carregar os exercícios"** + link **"Tentar novamente"**.
- Cap banner and disabled "Adicionar"/"Criar e adicionar" unchanged (other PRD).
- Create mode: identical to §5.2's fields, button "Criar e adicionar" — disabled while the form
  is invalid (as §5.2) or at the cap; same "Selecione pelo menos um grupo muscular" message.

### 5.5 `WorkoutExerciseCard` (no new frame; existing editor frame)

- The single group pill becomes one pill per `muscleGroups[]` entry, primary first, same style.
  Nothing else changes.

## 6. Testing strategy

Named so verification.md can look for them.

**`unit` project (`npx vitest --project unit`)**
- `src/lib/validation/exercises.test.ts` — `exerciseSchema`:
  - `rejects an empty muscleGroupIds with "Selecione pelo menos um grupo muscular"` (R40/E13, R31/E22, F10 — the one mirrored rule)
  - `accepts one or more group ids` (R39, R43)
  - `accepts an empty videoUrl and rejects a non-URL` (R42 — unchanged behavior kept)
  - `requires a name` (unchanged behavior kept)
- `src/lib/workoutEditor/autosave.test.ts` — unchanged tests, fixtures reshaped; the whole file
  must still pass (proves the engine is indifferent to the `Exercise` shape).

**Storybook (`npx vitest` — the `storybook` project; `npm run storybook` to look)**
- `MultiSelect.stories.tsx`: `Placeholder`, `Selected` (trigger reads "Peito, Tríceps"), `Open`
  (play: click trigger → listbox visible → click "Costas" → `onChange` called with
  `["1","2","5"]` in option order and the listbox is still open), `KeyboardToggle` (ArrowDown
  opens, Space toggles the focused option, Escape closes and focuses the trigger), `Disabled`,
  `WithError` (shows "Selecione pelo menos um grupo muscular") — D13/F7.
- `ExerciseRow.stories.tsx`: `Starter` (no button named "Editar exercício"; pills "Peito",
  "Tríceps"), `Own` (button present; click → `onEdit`), `NoVideo` ("—") — R28/D15.
- `ExerciseDialog.stories.tsx` (new file, F15; seeds `["muscleGroups"]`): `Create` (title "Novo
  exercício", no Excluir), `EditOwn` (`remadaPropria`: Excluir present, trigger reads "Costas,
  Bíceps"), `MissingGroup` (play: type a name → "Criar exercício" still disabled; check then uncheck a
  group → "Selecione pelo menos um grupo muscular" visible, button disabled, `api.create` not
  called — R40/E13), `SubmitEnabledWhenValid` (name + one group → button enabled), `GroupsUnavailable` (`failing` seed → disabled
  control + "Não foi possível carregar os grupos musculares"), `DeleteRefusedInUse` (`api.remove`
  rejects with `new ApiError({ code: "PRECONDITION_FAILED", message: "Exercise 7 is used by a
  workout and cannot be deleted" }, 409)` → play clicks Excluir → alert with "Não é possível
  excluir este exercício", and the English message is **not** in the document; `onClose` not called — R34/E5, D16/F12),
  `DeleteFailedGeneric` (`api.remove` rejects with a 404 `ApiError` → root error box, no refusal
  block).
- `AddExerciseDialog.stories.tsx` (extend): `Default` and `CapReached` kept (seed key updated);
  `Loading` (`pending` seed → skeletons, no "Não encontrou o exercício?"), `ListError` (`failing`
  seed → "Não foi possível carregar os exercícios" + "Tentar novamente"), `FilteredByGroup`
  (`'["exercises",{"muscleGroupId":2,"q":""}]'` seeded with the Costas subset; play picks
  "Costas" in the filter → only those rows), `CreateMissingGroup` (create mode, submit without a
  group → the validation message) — F17, R45, R40.
- `WorkoutExerciseCard.stories.tsx` (extend `WithSets`): asserts both pills of `supinoCard`
  ("Peito", "Tríceps") are visible — R11 rendering.
- `WorkoutEditorSession.stories.tsx`: unchanged assertions; seed keys updated.

**Not covered, and why it is acceptable.** `ExerciciosContent` has no story (pages under
`src/app/` have no tests; not the first). Its row logic lives in `ExerciseRow` (stories above),
its filter/search wiring is exercised by the browser walkthroughs in verification.md (which also
prove the exact requests), and its error state uses the same pattern the picker's `ListError`
story renders. `useDebouncedValue` has no unit test (a React hook; the `unit` project is
node-only) — its effect is observed in the walkthrough as "one request after typing stops".

## 7. Out of scope

- A shared floating-position hook for `Dropdown` and `MultiSelect` (D13's condition) — follow-up
  once `Dropdown`'s parity audit can be re-run cheaply.
- A confirmation step before Excluir (today's dialog deletes on click; unchanged).
- Filter/search in the URL (`?grupo=`), persisted filter, pagination (api F17), accent-
  insensitive search (brief), platform-team surfaces (R25/R37/R38), starter-set videos/
  descriptions (PRD §6), client-side screens (R20–R24), a `CloneWorkout`-backed clone UI (R19),
  Increment 2 (no web change).
- Showing *why* a 403 happened on save/delete: unreachable through the UI (R28), generic error is
  enough.

## 8. Delivery plan

| PR | Title | Increment | Contains (spec §) | Depends on | Verified by |
|---|---|---|---|---|---|
| PR1 | `MultiSelect` ui component with stories | 1 | §4 (MultiSelect), §6 | `Design: design-ok` in this spec | verification.md §1.1 |
| PR2 | Switch the web to the new `Exercise`/`MuscleGroup` contract (api client, types, validation, fixtures, and the consumer edits that keep `main` building) | 1 | §1, §2, §4 (forms), §5.2, §5.5, §6 | PR1; on vertice-bff `main`: `GET /api/muscle-groups`, `GET /api/exercises` returning `{muscleGroups, isStarter}`, `POST /api/exercises` and `PATCH /api/exercises/:id` accepting `muscleGroupIds`, the composed endpoints (`GET /api/workouts/:id/full`, `POST /api/training-plans/:planId/workouts`, `PUT /api/workouts/:workoutId/exercises`) embedding the new shape; `design-ok` | verification.md §1.2 |
| PR3 | `/exercicios`: group filter, server-side search, `ExerciseRow`, list error state | 1 | §3, §4 (catalog), §5.1, §6 | PR2; on vertice-bff `main`: `GET /api/exercises?muscleGroupId=&q=` (server-side filter/search, upstream order); `design-ok` | verification.md §1.3 |
| PR4 | `ExerciseDialog`: in-use delete refusal (409) | 1 | §4 (delete), §5.3, §6 | PR2; on vertice-bff `main`: `DELETE /api/exercises/:id` → 409 `PRECONDITION_FAILED`; `design-ok` | verification.md §1.4 |
| PR5 | `AddExerciseDialog`: group filter, server-side search, loading/error states | 1 | §4 (picker), §5.4, §6 | PR3 (shares `useDebouncedValue` and `exercisesQueryKey` usage patterns); `GET /api/exercises?muscleGroupId=&q=` on vertice-bff `main`; `design-ok` | verification.md §1.5 |

Deploy: PR2 is the first PR whose `main` needs the new BFF; it goes out in the D9 coordinated
window (api → bff → web). PR1 can merge as soon as the design gate opens, before any upstream
change exists.

### PR1 — `MultiSelect` ui component with stories
Branch: `feat/exercise-starter-catalog-multiselect`. Scope: `src/components/ui/MultiSelect/`
(`MultiSelect.tsx`, `MultiSelect.stories.tsx`, `index.ts`) and its re-export from
`src/components/ui/index.ts`, behaving as §4 describes, styled from the `Exercício — múltiplos
grupos` frame. Nothing consumes it yet. Deliberately left out: any positioning refactor of
`Dropdown`. After merge, `main` still deploys: additive, unused. Done when: verification.md §1.1
passes.

### PR2 — Switch the web to the new `Exercise`/`MuscleGroup` contract
Branch: `feat/exercise-starter-catalog-contract`. Scope: `types.ts`, `muscleGroups.ts`,
`exercises.ts` (params, key helper, `ExerciseInput`), `validation/exercises.ts` + its unit test,
`storyFixtures.ts`, `storyQuery.tsx`, `autosave.test.ts` fixture lines; and the smallest
consumer edits that compile and behave: `WorkoutExerciseCard` pills, `page.tsx` pills + name-only
client search (temporary, removed in PR3) + the `!isStarter` pencil condition (R28 — one line,
the most visible rule), `AddExerciseDialog` pills + create form on `MultiSelect`, `ExerciseDialog`
on `MultiSelect` with its new stories (minus the 409 story). `fetchExercises` is still called
without params. Deliberately left out: the group filter, server-side search, the 409 block, the
page split. Files: §2 minus `ExerciseRow`, `ExerciciosContent`, `useDebouncedValue`. After
merge, `main` builds and its tests pass; it is deployable only together with the new BFF (D9
window). Done when: verification.md §1.2 passes.

### PR3 — `/exercicios`: group filter, server-side search, `ExerciseRow`, list error state
Branch: `feat/exercise-starter-catalog-catalog-page`. Scope: `page.tsx` → server page +
`ExerciciosContent.tsx`; `useDebouncedValue`; `ExerciseRow` + stories; the filter `Dropdown`,
`exercisesQueryKey`-driven query with `keepPreviousData`, removal of the client-side `useMemo`
filter, the subtitle copy, the error state and the muscle-group-failure degradation (§5.1).
Deliberately left out: anything in the dialogs. After merge, `main` deploys against the PR2-era
BFF (the query params are optional upstream). Done when: verification.md §1.3 passes.

### PR4 — `ExerciseDialog`: in-use delete refusal (409)
Branch: `feat/exercise-starter-catalog-delete-refusal`. Scope: the `PRECONDITION_FAILED` branch
in `deleteMutation.onError`, the refusal block (§5.3), the `DeleteRefusedInUse` and
`DeleteFailedGeneric` stories. ~60 lines; its own PR so the reviewer's attention is on the error
treatment. After merge, `main` deploys. Done when: verification.md §1.4 passes.

### PR5 — `AddExerciseDialog`: group filter, server-side search, loading/error states
Branch: `feat/exercise-starter-catalog-picker`. Scope: the compact filter `Dropdown`, debounced
server-side search through the shared key helper, `ListRowSkeleton` loading, error state,
the four new stories (§6). Deliberately left out: nothing further. After merge, `main` deploys.
Done when: verification.md §1.5 passes; then verification.md §2 for the whole feature.
