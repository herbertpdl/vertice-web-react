# Technical assessment (Web): Starter exercise catalog

Status: Draft
Owner: hebertpdl@gmail.com
Related: [`vertice-api` PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/exercise-starter-catalog/prd.md)
(no dedicated web PRD exists for this slug — assessed directly against it),
[`vertice-api` assessment](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/exercise-starter-catalog/assessment.md),
[`vertice-bff` assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/exercise-starter-catalog/assessment.md)
Spec: not yet written (will be `docs/specs/exercise-starter-catalog/spec.md`)

## 1. Summary

Overall risk: **Medium**. No dedicated web PRD exists for this slug, so there's no `Design:`
header line to check — design-file approval is raised as an open dependency (§7), not assumed
either way. This feature reshapes two existing screens rather than adding new ones: the
`/exercicios` catalog page and the `AddExerciseDialog`/`ExerciseDialog` pair already implement
most of this PRD's *shape* (list, search, create-or-pick, edit) against the current single-group
model — but with zero ownership distinction (every exercise gets an edit icon today) and no
muscle-group multi-select, filter, or the "at least one group" validation this PRD needs. The
whole thing is gated on `vertice-api` and `vertice-bff` shipping their own changes first. Decided
this session: a starter-set row gets no edit icon and no other marker (it's the default,
always-there baseline); a trainer's own exercise gets the edit icon, and its presence *is* the
"this is custom" signal — no separate badge.

| Id | Severity | One line |
|---|---|---|
| F4 | Blocker | Every upstream dependency (API + BFF) this feature needs is itself unshipped — this work can be spec'd now, not implemented or run end-to-end yet |
| F7 | High | `Dropdown` is single-value only; multi-group selection (R3/R11/R43) needs new component work, not a prop tweak |

## 2. PRD coverage map

| Rule/Edge | Lands on | Notes |
|---|---|---|
| R1 | existing screen: `/exercicios` (`page.tsx`) | no route change |
| R2 | not applicable to the web | content constraint |
| R3 | existing component must change: group `Dropdown` in `ExerciseDialog.tsx`/`AddExerciseDialog.tsx` | F7 |
| R4 | not applicable | |
| R5 | not applicable | |
| R6 | not applicable | |
| R7 | not applicable | |
| R8 | existing must change: `muscleGroupLabels` (`validation/exercises.ts:12-20`, 7 entries) → 14 | |
| R9 | not applicable directly | covered by R8's label content |
| R10 | not applicable | |
| R11 | same as R3 | |
| R12 | not applicable | |
| R13 | existing screen `/exercicios` | satisfied once BFF returns the right list |
| R14 | existing screen must change: no "mine vs. shared" distinction exists today | decided this session — edit icon presence *is* the signal, no badge |
| R15 | not applicable | server-enforced |
| R16 | not applicable to the web | no direct exercise-by-id URL/route exists in this UI |
| R17 | existing component must change: `AddExerciseDialog`'s catalog search | see BFF assessment F7 for the server-side half |
| R18 | not applicable to the web | server-enforced; editor always operates inside one plan |
| R19 | not applicable to the web as currently built | F2 — no UI path calls `CloneWorkout` at all |
| R20 | not applicable to this PRD's scope | client-facing session screens aren't built yet (F3) |
| R21 | not applicable to this PRD's scope | F3 |
| R22 | not applicable to this PRD's scope | F3 |
| R23 | not applicable to this PRD's scope | F3 |
| R24 | not applicable to this PRD's scope | F3 |
| R25 | not applicable | no platform-team UI exists in the product |
| R26 | existing screen/component must change: `/exercicios`'s pencil icon, `ExerciseDialog`'s Excluir button | both currently unconditional |
| R27 | same as R26 | |
| R28 | same as R26 | this is literally what's currently violated |
| R29 | existing (`ExerciseDialog` rename) + R14's ownership gating | |
| R30 | existing (`ExerciseDialog` fields) + R14's ownership gating + R3's multi-group UI | |
| R31 | existing screen must change: no "at least one group" validation exists (`exerciseSchema`) | same fix as R40 |
| R32 | not applicable directly | prevented by R14/R28's omission of the edit affordance, not a separate web-side check |
| R33 | not applicable | exercise name is read live everywhere it's rendered already |
| R34 | existing screen must change: delete flow has no in-use-refusal UI treatment | F12 |
| R35 | existing (`deleteExercise` mutation already works for the unused case) | |
| R36 | not applicable directly | same reasoning as R32 |
| R37 | not applicable | no platform-team UI | 
| R38 | not applicable | no platform-team UI; also PRD §6 out of scope |
| R39 | existing (`ExerciseDialog`/`AddExerciseDialog` create forms) + R3's multi-group | |
| R40 | existing screen must change: same fix as R31 | |
| R41 | existing (`description` field already present) | |
| R42 | existing (`videoUrl` field, `.url()` validation already present) | |
| R43 | same as R3 | |
| R44 | existing/nothing found | no client-side uniqueness check exists |
| R45 | existing component must change: no muscle-group filter exists anywhere today | F8 |
| R46 | existing, partial gap: `/exercicios` searches name+group label; `AddExerciseDialog` searches name only | |
| R47 | not applicable | server-side query semantics |
| R48 | not applicable | server-side ordering; web must stop re-filtering client-side (F8) |
| R49 | not applicable | same |
| R50 | not applicable | same |
| R51–R59 | not applicable | internal `vertice-api` migration facts, no UI surface |
| E1 | existing must change (R26) | |
| E2 | existing must change (R27) | |
| E3 | existing/nothing found (R44) | |
| E4 | existing/nothing found (R14/R44) | |
| E5 | existing must change (R34) | |
| E6 | not applicable (R33) | |
| E7 | not applicable to this PRD's scope | F3 |
| E8 | not applicable (R11/R47) | |
| E9 | not applicable | out of scope, existing R42 field covers it |
| E10 | not applicable | |
| E11 | not applicable | |
| E12 | not applicable | |
| E13 | existing must change (R40) | |
| E14 | not applicable/existing (R15, server-enforced) | |
| E15 | not applicable (R46, server-side semantics) | |
| E16 | not applicable to this PRD's scope | F3 |
| E17 | not applicable to this PRD's scope | F3 |
| E18 | not applicable to the web directly | no UI path lets a trainer type an arbitrary exercise id |
| E19 | not applicable to the web directly | `AddExerciseDialog` only ever offers ids `fetchExercises` returns; ties to F17/BFF F7 |
| E20 | not applicable to the web as currently built | F2 |
| E21 | not applicable (R32/R36, server-enforced) | |
| E22 | existing must change (R31/R40) | |
| E23 | not applicable | internal migration |

## 3. Current state

This repo is **not** a skeleton — `/exercicios` (`src/app/(app)/exercicios/page.tsx`) is a working
catalog screen: a searchable table (client-side filter over the full fetched list, matching name
or the translated group label), a "Novo exercício" button opening `ExerciseDialog` for create, and
a per-row pencil icon opening the same dialog for edit — today, on *every* row, with no ownership
distinction at all. `ExerciseDialog.tsx` is one form for both create and edit, single-select
`Dropdown` for `muscleGroup` (7-value enum, matching `vertice-api`'s current proto exactly), and
an unconditional "Excluir" button when editing.

`AddExerciseDialog.tsx` (opened from the workout editor, `WorkoutEditor.tsx:441`) is this PRD's
Flow 1/Flow 2 already half-built: a two-mode dialog ("Buscar no catálogo" / "Criar novo") that
searches the same fetched list by name only and hands a picked or newly-created exercise back to
the workout draft. It has no muscle-group filter, no ownership check on which exercise ids it
offers, and no loading state (`exercises` starts `undefined`; the "não encontrou" empty-state
copy can flash before the fetch resolves — pre-existing, unrelated to this feature, but touched
by it).

`src/lib/api/exercises.ts` wraps the full CRUD surface already (`fetchExercises`, `fetchExercise`,
`createExercise`, `updateExercise`, `deleteExercise`); `src/lib/validation/exercises.ts` has the
single-group Zod schema and the 7-entry `muscleGroupLabels` PT-BR map; `src/lib/api/types.ts:58-64`
has the matching `Exercise`/`MuscleGroup` types. All four need to change together for R3/R8/R11/
R43. `Dropdown` (`src/components/ui/Dropdown/Dropdown.tsx:8,19`) is single-value only
(`value: string`, `onChange?: (value: string) => void`) — confirmed by reading its props, not
assumed.

`CloneWorkoutDialog.tsx` — despite its name and an inline comment quoting a *different* PRD's rule
numbering (`create-workout-with-exercises`'s R25, not this PRD's) — doesn't call the BFF's
`POST /workouts/:id/clone` endpoint at all (`grep -rn "clone" src/lib/api/*.ts` — no hits). It
fetches a full source workout (`fetchFullWorkout`) and prefills a new draft with it client-side.
R19/E20 (this PRD's clone-ownership rules) have no reachable surface in this repo today.

No dedicated web PRD exists for this slug (`docs/prds/` in this repo has no
`exercise-starter-catalog` entry), so there's no `Design:` header to check — per this skill's own
convention, design-file readiness is an open dependency (§7), not assumed satisfied or blocking.

## 4. Findings by dimension

### PRD fit and the design gate

**F1** [High] — No dedicated web PRD exists for this slug, so there's no `Design:` line to read.
Given the scope of UI change this feature needs (a new multi-select control, an ownership-gated
edit affordance, a group-filter control, distinct in-use-delete messaging), the pen.dev design
file (`Vertice Web.pen`) almost certainly needs new/changed frames before implementation, per this
repo's own `CLAUDE.md` gate ("implementation starts only after the owner sets that line to
`Design: design-ok`") — that convention still applies even without a literal header line to flip.
*Recommendation:* treat design-file update + approval as an explicit, named dependency in the spec
(§7), the same as if a web PRD carried a `pending` line.

**F2** [Info] — R19/E20 assume a `CloneWorkout`-RPC-backed flow, but this repo's actual "clone" UI
doesn't call that RPC (see §3). These rules land as "not applicable to the web as currently
built." The functionally similar risk — previewing another trainer's private exercise names via
the template picker — is a property of `fetchRecentWorkouts`/`fetchFullWorkout`'s own scoping, a
different feature's concern, not this PRD's.

**F3** [Info] — `CLAUDE.md` states plainly: "Client-side screens (do-a-workout session, progress)
are not built yet." R20–R24 (every client-visibility/refusal rule) therefore have no web surface
to land on in this repo today — R20 will be satisfied automatically whenever that screen is built
(it already composes exercise data server-side, per the BFF assessment), and R21–R24 are moot
until a CLIENT-role screen exists to restrict.

### Upstream readiness (BFF/API dependency)

**F4** [Blocker] — Every upstream piece this feature needs is itself unshipped: `vertice-api`'s
new RPC shapes (multi-group, filter/search, ownership) and `vertice-bff`'s corresponding route/
schema changes are both still at the assessment stage (this PRD's own chain). This screen work can
be spec'd and reviewed now against the documented target shape, but cannot be implemented against
a real upstream or run end-to-end until both repos ship.

**F5** [Nothing found] — Checked: whether a new `src/lib/api/*.ts` module is needed.
`src/lib/api/exercises.ts` already wraps every relevant endpoint; this feature only changes field
shapes and adds query params to functions that already exist.

### Screens and routing

**F6** [Nothing found] — Checked: whether this needs a new route or screen. It doesn't — `/exercicios`
and the two existing dialogs are the right, and only, screens to change.

### Design system and the Pencil sync

**F7** [High] — `Dropdown` (`src/components/ui/Dropdown/Dropdown.tsx:8,19`) takes `value: string`
and a single-value `onChange` — confirmed by reading the component, not assumed. R3/R11/R43 need
multiple groups selected at once. This is new component work, not a prop addition: either a new
multi-select component (following `Dropdown`'s own floating-UI reference pattern — portal to
`document.body`, `fixed` positioning from `getBoundingClientRect()`, flip, `z-[60]`) or a
multi-select *mode* added to `Dropdown` itself. Ties directly into F1 — this is exactly the kind
of new UI state the design file needs a frame for before implementation starts.

**F1a** [Info, cross-ref decided this session] — The starter-set/custom distinction (R14/R28) is
resolved: no badge, no marker on starter-set rows — they're the default, always-there baseline.
A trainer's own exercise gets the edit icon, and the icon's presence is itself the "this is
custom" signal. This is a smaller design/implementation surface than a badge would have been —
`/exercicios/page.tsx`'s row rendering only needs to conditionally omit the `<button>` (pencil)
based on an ownership field from the BFF response, not add new visual elements.

### Data fetching and cache invalidation

**F8** [Medium] — `/exercicios/page.tsx` and `AddExerciseDialog.tsx` both fetch the *entire*
exercise list via `useQuery(["exercises"], fetchExercises)` with no params, then filter
client-side in a `useMemo`. Once R45/R46 exist as real server-side query params (per the upstream/
BFF assessments), this should become `useQuery(["exercises", { search, muscleGroupId }],
() => fetchExercises({ search, muscleGroupId }))`, both for correctness — R47–R50's ordering is
decided server-side; re-filtering a fully-fetched array in JS would scramble or ignore it — and to
avoid pulling the full starter set plus every trainer's private rows on every catalog/picker open.

### API client and validation

**F9** [Medium] — `Exercise`/`MuscleGroup` (`types.ts:49-64`), `exerciseSchema` (
`validation/exercises.ts:22-30`), and `ExerciseInput` (`api/exercises.ts:20-25`) all hard-code
`muscleGroup` as a single required enum; `muscleGroupLabels` has 7 entries. All four need to
change together for R3/R8/R11/R39/R43 — this is a coordinated rename across every file that reads
`exercise.muscleGroup`, not an isolated schema tweak. The PRD's own §10 group names (Peito,
Costas, Ombros, …) are the literal PT-BR labels to use, so no translation judgment call is needed.

**F10** [Medium] — No "at least one group" validation exists today (a single required enum
trivially satisfies that); the list-based schema needs an explicit non-empty check
(R31/R40/E13/E22), following this repo's existing inline-Zod-refinement style.

### Error handling and session edges

**F11** [Medium] — `useRedirectOnError` (`src/lib/hooks/useRedirectOnError.ts`) is built for a
single-resource detail page bouncing on `FORBIDDEN`/`NOT_FOUND` (someone else's plan/workout).
Once the BFF starts returning `FORBIDDEN` for a cross-trainer exercise fetch (per the BFF
assessment's F10 evidence), decide whether the catalog — a *list*, not a detail page — needs the
same whole-screen-bounce treatment, or should instead just drop/hide the offending item and show
an inline error, since a full redirect doesn't fit a list the way it fits a single resource.

**F12** [Medium] — `ExerciseDialog`'s `deleteMutation.onError` (`ExerciseDialog.tsx`) sets a
generic `errors.root` message from `error.message` for every failure alike — no distinct handling
for a 409 `PRECONDITION_FAILED` (R34, "can't delete, a workout uses it"). This repo has an
existing precedent for treating that status distinctly (the workout editor's replace-refusal, per
`CLAUDE.md`'s own description of `PreconditionFailedError`) — recommend the same: the upstream
message shown verbatim, visually distinct from a plain validation error.

### State complexity

**F13** [Nothing found] — Checked: whether this needs anything beyond plain form state. It
doesn't — react-hook-form + a mutation throughout, same as today. `AddExerciseDialog`'s two-mode
local `useState` ("search"/"create") is already the right shape and only needs new fields, not a
structural change.

### Copy and localization

**F14** [Medium] — All 14 muscle-group PT-BR labels (R8/R9) and every new UI string this feature
introduces (group-filter placeholder, any "no groups selected" validation message) must follow
`muscleGroupLabels`'s existing map pattern and stay in Portuguese — no English strings. The PRD's
§10 already supplies the exact label text to reuse verbatim.

### Testing

**F15** [Medium] — `AddExerciseDialog` has a `*.stories.tsx` today; `ExerciseDialog` does not
(`find src/components/domain/ExerciseDialog -type f` — only `ExerciseDialog.tsx`/`index.ts`).
`ExerciseDialog` is the component gaining the most complexity from this feature (multi-select
groups, ownership-gated edit/delete, the new in-use-delete treatment from F12) — this feature
should be the one to add its stories, following `AddExerciseDialog.stories.tsx`'s existing pattern
in the sibling directory.

**F16** [Nothing found] — Checked: whether this feature needs `unit`-project (pure-logic) test
coverage beyond stories. It doesn't — nothing here rises to the workout editor's
autosave-engine level of logic; story-level coverage of the changed components is the right level,
consistent with how the rest of the app outside the workout editor is tested.

### Performance and loading UX

**F17** [Medium] — `AddExerciseDialog` has no loading state for its catalog search: `exercises`
starts `undefined`, `filtered` resolves to `[]` before the query settles, and the "Não encontrou o
exercício?" empty-state message can render during the loading window, not only on a genuine
zero-result search — unlike `/exercicios/page.tsx`, which already checks `isPending` and renders
`TableRowSkeleton`s. Pre-existing gap, unrelated to this feature's rules, but this feature already
touches this component (F7, F8) and should fix it in the same pass.

## 5. Options

**Multi-select muscle-group UI (F7):**

- **Option A — add a multi-select mode to `Dropdown` itself** (e.g. `multiple?: boolean`,
  `value: string[]`). One component, reuses the already-correct floating/portal behavior.
  Cost: `Dropdown`'s current single-value type (`value: string`) is used by every other
  single-select caller in the app (day-of-week, set strategy, …) — broadening its API risks all of
  them for a need only this feature has.
- **Option B — a new dedicated multi-select component**, following `Dropdown`'s floating-UI
  reference pattern (portal, fixed position, flip, `z-[60]`) as its own implementation.
  Cost: some duplication of the positioning logic unless it's first factored into a shared hook
  both components use.

**Recommendation: Option B**, extracting the shared positioning logic into a hook first if it
isn't already reusable — safer than widening `Dropdown`'s value type for every existing
single-select caller in the app.

## 6. Testing strategy

- **Stories for `ExerciseDialog`** (new file, F15): default create, edit-own (edit/delete
  enabled), multi-group selection states, the "at least one group" validation error, and the
  distinct in-use-delete (`PRECONDITION_FAILED`) treatment from F12.
- **Stories for the new multi-select component** (Option B): default, multiple selected, keyboard
  navigation, no-room-below flip — same state coverage `Dropdown.stories.tsx` already has for the
  single-select case.
- **`/exercicios` page**: update its existing story/manual-QA coverage (none exists as an
  automated page test today, consistent with CLAUDE.md's "pages under `src/app/` have no tests" —
  not proposing this feature be the first) for: an exercise row with no edit icon (starter-set),
  one with an edit icon (own), the group-filter control, and the loading/empty states.
- **`AddExerciseDialog` stories** (existing file, extend): add cases for the group filter and the
  fixed loading-state gap (F17).
- **Zod schema**: extend whatever `unit`-level coverage the validation module gets (none exists
  today for `exercises.ts` specifically) only if the multi-group refinement logic (F10) is
  non-trivial enough to warrant it beyond story-level form testing; otherwise story coverage of
  the dialog exercising the validation error is enough.

## 7. Effort and risk

**Size: L.** No new route or screen, no new state-engine complexity (F13) — but touches two
dialogs deeply (one needs genuinely new multi-select component work, F7), four shared files that
must change together (F9), new copy (F14), and is fully gated on both `vertice-api` and
`vertice-bff` shipping first (F4). Also gated on the design file being updated and approved (F1) —
this repo's CLAUDE.md gate applies here even without a dedicated web PRD carrying the literal
`Design:` line, and that update should happen before implementation starts, not alongside it.
Realistic sequencing: the design file and the new multi-select component (F7) can be built/reviewed
in parallel with `vertice-api`/`vertice-bff`'s work, since neither depends on the live upstream
shape; wiring the screens to real data is what has to wait for F4.

## 8. Questions and assumptions

- **Q1 (asked and answered this session): starter-set row treatment.** Decided: no badge, no
  marker on starter-set rows (they're the default, always-there baseline); a trainer's own
  exercise gets the edit icon, and the icon's presence is itself the "this is custom" signal.
  Recorded in F1a; the spec should treat this as settled, not reopen it.
- **Q2: is a pen.dev design-file update for this feature already planned, or does this
  assessment's F7 (new multi-select component) and F1a (icon-only ownership signal) constitute
  the first the owner is hearing of the concrete UI surface needed?** Assumption until answered:
  treat the design update + `design-ok` approval as a named, blocking dependency in the spec (§7),
  the same as this repo's CLAUDE.md gate would require if a dedicated web PRD existed for this
  slug.

## 9. Inputs to the spec

- [ ] Design-file update and approval as a named dependency, given no web PRD carries the literal gate line (F1, F1a)
- [ ] Multi-select component approach — extend `Dropdown` vs. a new component (F7, §5)
- [ ] The coordinated `types.ts`/`validation/exercises.ts`/`api/exercises.ts`/`muscleGroupLabels` change for 14 groups (F9)
- [ ] The non-empty-group validation rule and its error copy (F10)
- [ ] Whether `useRedirectOnError`'s whole-screen-bounce pattern applies to the catalog list, or a per-row inline treatment instead (F11)
- [ ] Distinct UI treatment for a 409 `PRECONDITION_FAILED` delete refusal, following the workout editor's existing precedent (F12)
- [ ] Server-side filter/search query params replacing today's full-fetch-then-filter-in-JS (F8)
