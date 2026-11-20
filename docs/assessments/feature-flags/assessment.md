# Technical assessment (Web): Feature flags

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api `docs/prds/feature-flags/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/feature-flags/prd.md)
(source PRD, Approved 2026-11-20; no web PRD exists for this slug),
[vertice-api `docs/assessments/feature-flags/assessment.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/feature-flags/assessment.md),
[vertice-bff `docs/assessments/feature-flags/assessment.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/feature-flags/assessment.md)
(the routes in A1), `docs/specs/admin-panel/spec.md` (the panel this page joins)

Revised 2026-11-20: the owner withdrew R23 (flag changes are not recorded in the admin action
history in this version; PRD §6 defers it). W3 is withdrawn, and A1 now uses the BFF
assessment's actual routes.
Spec: not yet written (will be `docs/specs/feature-flags/spec.md`)

## 1. Summary

Overall risk: Medium.

**Design gate.** No web PRD exists, so there is no `Design:` line. Screens do change: a new admin
page and a per-user view (owner decision). Step 4 drafted 12 frames on 2026-11-20 (after the
owner upgraded pen.dev) in a new section of `Vertice Web.pen`: "Admin — Feature flags
(feature-flags)" (`tk2sX`). The file had no earlier feature-flags frames. The owner approved the
frames (**design-ok, 2026-11-20**), so the design gate is clear (Q1, W1 resolved). The frames
are listed in dimension 4 and §9.

**What it touches:**
- a new route `/painel/flags` (plus a per-user view), one `ADMIN_NAV` entry;
- a new `src/lib/api/adminFeatureFlags.ts` wrapper over BFF routes that don't exist yet (W2).

The history page does not change in this version (R23 withdrawn).

No new kit component is needed: `DataTable`, `Switch`, `ConfirmDialog`, `TextField`, `Dropdown`,
`Badge` and `Toast` cover every interaction. State is plain query + mutation, with no autosave
engine.

| Id | Severity | One line |
|---|---|---|
| W2 | Blocker | The BFF has no flag routes and `schema.ts` has no flag types yet; the page can only be built against a documented contract |
| W1 | High (resolved) | Frames in section `tk2sX` approved by the owner (design-ok, 2026-11-20) |
| W4 | High | The everyone switch must send the absolute target state shown in the dialog, not a toggle, or a concurrent change (R25) gets inverted |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1 | existing must change: `src/components/layout/AdminShell/nav.ts:8-13` | New item "Feature flags", `href: "/painel/flags"` (Q2) |
| R2 | new: `src/app/(admin)/painel/flags/{page,FeatureFlagsContent}.tsx` | All flags, unpaginated (API F8) |
| R3 | new: list columns | Name, description, everyone `Switch`, count of user settings (W10) |
| R4 | new: client-side filter in `src/lib/admin/featureFlags.ts` | Name + description, no server search (W7) |
| R5 | existing: `src/app/(admin)/layout.tsx:16-26` | Role check before any markup; the BFF/API enforce ADMIN too |
| R6 | existing | No per-admin differences anywhere in the panel |
| R7 | not applicable to this page | Trainers never reach `/painel/**` (`src/proxy.ts:20-21`, `bffAllowList.ts:30`); the AI assistant's web consumption is W11 |
| R8 | not applicable to the web | Migrations (API F9) |
| R9 | new: no create/delete controls | Nothing to build beyond leaving them out |
| R10 | new: description shown as sent | Copy is in the API migration (W10) |
| R11 | new: everyone `Switch` per row and on the per-user view | W4 |
| R12 | existing: `src/components/domain/ConfirmDialog/ConfirmDialog.tsx` | Cancel changes nothing (E13) |
| R13 | new: add form (number + Ligado/Desligado) | W5, W6 |
| R14 | new: add/change/remove mutations, no dialog | W8 |
| R15 | new: same number again replaces | Upsert on the BFF; the UI says it replaces |
| R16 | new: remove button per user row | |
| R17 | new: number-only input, no lookup, no profile link | W6 |
| R18 | new: per-user list unpaginated | Fine at today's volume (W5) |
| R19, R20 | not applicable to the web | Evaluation is server-side |
| R21 | not applicable to this page; W11 for consumers | The page shows saved state at once; the subtitle can say "em até 1 minuto" |
| R22 | not applicable to the web | |
| R23 | withdrawn (2026-11-20) | Not recorded in the history in this version; `actions.ts` and `HistoryContent.tsx` stay as they are (W3 withdrawn) |
| R24 | nothing to build | No reason field (unlike suspend, `adminReasonSchema`) |
| R25 | new: absolute-value writes, the returned flag shown after save | Last save wins (W4) |
| R26, R28 | not applicable to the web | Seed migration; the page shows what the BFF returns |
| R27 | not applicable to the web | The web has no flag env today (`grep -rn ENABLED src` finds nothing) |
| R29 | nothing to build | Reminder is in the description (API F12) |
| E1, E2 | not applicable to the web | Evaluation |
| E3, E4 | new: accepted as typed | W6 helper copy |
| E5 | new: upsert | One row, now OFF |
| E6 | new: remove | |
| E7 | new: `DataTableMessage` "Nenhuma flag encontrada" | Owner copy |
| E8 | not applicable to the web | |
| E9 | new: NOT_FOUND on a removed flag | The flag leaves the list on the next read (W8) |
| E10, E11 | not applicable to this page | W11 |
| E12 | new: last save wins | W4 |
| E13 | existing `ConfirmDialog` Cancelar | |
| E14 | nothing to build | |
| E15 | nothing to build | The description names which user counts |

## 3. Current state

- **Admin layout and menu.** `src/app/(admin)/layout.tsx` does the server-side ADMIN check and
  wraps every page in `AdminShell` (`src/components/layout/AdminShell/AdminShell.tsx`), which
  renders `SideNav` from `ADMIN_NAV` (`nav.ts:8-13`: Dashboard, Usuários, Exercícios, Histórico).
  `activeAdminSection` matches by prefix (`nav.ts:16-19`), so a `/painel/flags/[key]` view
  highlights the same item for free.
- **Routing and proxy.** `src/proxy.ts:20-21` serves `/painel/**` on the admin host only, and
  `src/lib/bffAllowList.ts:30-31` forwards every `/admin/**` BFF path from the admin host. New
  `/admin/...` flag routes need no allow-list change.
- **Page pattern.** `page.tsx` (server, reads `searchParams`, sets `metadata` "… — Painel Vertice")
  hands off to a `"use client"` `*Content.tsx`. Examples: `painel/exercicios/page.tsx:8`,
  `painel/historico/page.tsx:8`. Content pages share the same pieces:
  - title block, filters row, `DataTable` card;
  - `DataTableMessage` for empty and error, the error carrying "Tentar novamente";
  - filters kept in the URL via `router.replace` (`ExercisesContent.tsx:226-231`).
- **Writes.** Destructive writes go through `ConfirmDialog` (single submission, inline error,
  `cancelVariant="ghost"` on admin frames; `ExercisesContent.tsx:429-444`). Outcomes are toasts
  (`useToast`), and invalidation is per resource through `adminKeys` (`src/lib/api/admin.ts:46-65`,
  "never the bare `["admin"]`").
- **History.** `src/lib/admin/actions.ts` and `HistoryContent.tsx` are untouched in this version:
  R23 is withdrawn and the BFF adds no `AdminAction` values. If history is added later, the
  `Record<AdminAction, …>` maps (`actions.ts:8-22, 31-45`) and `contract.test.ts:29-31` will force
  labels, and the "Afetado" column (`HistoryContent.tsx:42-56`) will need a plain "Usuário #N" for a
  number with no account. That is the gap the withdrawn W3 described.
- **Kit.** `Switch` (`src/components/ui/Switch/Switch.tsx`) is a controlled checkbox with
  `role="switch"`. Extra props such as `aria-label` reach the `<input>` (line 28). `DataTable`
  takes `loading` (skeleton rows), `empty`, `error` and a required `mobileRow`.
- **Contract.** `src/lib/api/schema.ts` is generated from vertice-bff `docs/openapi.json` at
  `.bff-ref` `efcf252…`. It has no flag schemas and its `AdminAction` union has 13 members
  (line 1321).
- **Query defaults.** `src/app/providers.tsx`: `staleTime: 30_000`, `retry: 1`.

## 4. Findings by dimension

### 1. PRD fit and the design gate

**W1 (High, resolved 2026-11-20: design-ok). The design frames are drafted, but not approved.**
- **What:** Screens change (owner decision), and the PRD defines a new page, a per-user view and a
  confirmation. A first attempt at step 4 was blocked by pen.dev's plan limit. After the owner
  upgraded the plan (2026-11-20), step 4 drafted the frames in dimension 4's table. They reuse
  `izLYp`, `MsIFr`, `S8v0qW`, `vi3EM`, `U8EYgf`, `YtEgX`, `LYyWM`, `jjLsR`, and
  copies of `x81nY` and the `BVZe4` empty state. The owner approved them (design-ok, 2026-11-20).
- **Where:** new `src/app/(admin)/painel/flags/**`; PRD R1–R4, R11–R17, E7, E13; CLAUDE.md
  "Design gate".
- **Why it matters:** The admin pages are built from approved frames, and their doc comments cite
  frame ids (`HistoryContent.tsx:113`, `ExercisesContent.tsx:204`). Drafted frames are never
  approved frames.
- **Recommendation:** The owner reviews section `tk2sX` and approves it or asks for changes (Q1).
  Spec writing can start against these frames, but implementation waits for approval.

**W10 (Info). A flag's "name" is its key.**
- **What:** The API assessment defines a flag as a key, a description and the everyone state
  (F9, A3: uppercase snake case such as `AI_ASSISTANT_ENABLED`), with no separate display name.
  R3's "name" is therefore the key, and R10/R29's guidance lives in the description text that
  developers write in the migration.
- **Where:** API assessment F9, F12, A3; PRD R3, R10, R29.
- **Why it matters:** The row shows an English identifier next to pt-BR copy. That is acceptable,
  since it is the developers' identifier and the page is admin-only, but it should look like an
  identifier (monospace or semibold), not like a translated label.
- **Recommendation:** Show the key as sent and the description as sent. The descriptions must be
  pt-BR, which is a review point on the API migration (dimension 9).

Nothing else found. Checked:
- Every rule placed (§2).
- No conflict with admin-panel spec scope decisions: W19 still holds, with nothing invented beyond
  the contract.
- R7, R19–R22 and R26–R28 have no surface on this page.

### 2. Upstream readiness (BFF/API dependency)

**W2 (Blocker). The BFF routes and their types do not exist.**
- **What:**
  - There are no flag routes on vertice-bff `main` (`src/modules/admin/` has none). The BFF
    assessment defines four (A1).
  - Nothing exists in this repo's `schema.ts`.
- **Where:** new `src/lib/api/adminFeatureFlags.ts`; `src/lib/api/types.ts`;
  `src/lib/api/.bff-ref`; PRD R2–R16.
- **Why it matters:** The wire types come only from the BFF's generated OpenAPI. A hand-written
  type is against the repo rule (CLAUDE.md, "The BFF contract is generated").
- **Recommendation:**
  - The order is API, then BFF, then web (API §7).
  - The web spec can be written, and the screens built as stories with fetch stubs (like
    `HistoryContent.stories.tsx:13-29`), against the BFF spec's documented contract.
  - Merging waits for the BFF merge, `.bff-ref` bumped to it, and `npm run api:types`.

### 3. Screens and routing

**W5 (Medium). Where the per-user list lives.**
- **What:** "On a flag, the admin types a user number…" (flow 2) needs a surface for one flag's
  user settings, an add form, and per-row change and remove. `GET /api/admin/feature-flags`
  returns every flag with its user settings inline (A1), so either surface reads from the one list
  query.
- **Where:** new `src/app/(admin)/painel/flags/[key]/{page,FeatureFlagContent}.tsx`, or a new
  `src/components/domain/FeatureFlagUsersDialog`; PRD R13–R18.
- **Why it matters:** R18 sets no cap on user settings, so a dialog can grow long. A route gives a
  stable link and its own loading and error states. With settings inline, it costs no extra BFF
  read: it selects its flag from the list query.
- **Recommendation:** Option A in §5, a detail route `/painel/flags/[key]` under the same nav
  item. It is decided with the frames (Q1).

Nothing else found. Checked:
- the route group `(admin)` is covered by the layout check and the proxy;
- the server/client split matches the other admin pages;
- route naming (Q2).

### 4. Design system and the Pencil sync

Reused as-is:
- `DataTable` + `DataTableMessage` (list, per-user list, empty, error);
- `Switch` (everyone state; a user row's ON/OFF);
- `ConfirmDialog` (everyone switch);
- `TextField` (search, user number);
- `Dropdown` (Ligado/Desligado on add);
- `Badge` (`success` "Ligado", `neutral` "Desligado");
- `Button`, `Toast`, `TableRowSkeleton` (through `DataTable loading`).

No new `ui` component, so no `pencil-design-audit` run is needed for this feature. A segmented
ON/OFF control would be the only candidate, and `Dropdown` makes it unnecessary unless the frames
choose otherwise. `Dropdown` already portals (the reference pattern), so nothing clips.

Frames: the file had no feature-flags frames before. Step 4 drafted these on 2026-11-20, all
**approved by the owner (design-ok, 2026-11-20)** (W1, Q1 resolved). The history table needs no new frame (R23
withdrawn).

| Frame | Node id | State |
|---|---|---|
| Section "Admin — Feature flags (feature-flags)" | `tk2sX` | Holds every frame below |
| Admin — Feature flags | `ufeI3` | Default list: key, description, the "Para todos" switch, the count of user settings, "Ver usuários"; "Feature flags" active in the nav |
| Admin — Feature flags — busca com resultado | `tw3jw` | Search "assistente", one row, "1 de 2 flags" |
| Admin — Feature flags — busca sem resultado | `A3vAb` | "Nenhuma flag encontrada" + "Limpar busca" |
| Admin — Feature flags — confirmar ligar para todos | `pGJVX` | Generic confirmation over the list: "Ligar para todos?", "A flag `KEY` ficará ligada para todos os usuários sem configuração própria. A mudança vale em até 1 minuto.", primary "Ligar para todos"; the row's switch stays off until saved |
| Admin — Feature flags — confirmar desligar (erro ao salvar) | `vBk8U` | Same generic copy with "desligada", danger "Desligar para todos", and the inline error "Não foi possível salvar. Tente de novo." |
| Admin — Feature flags — carregando | `q1Y3N` | Skeleton rows (`U8EYgf`) |
| Admin — Feature flags — erro ao carregar | `Xp9eO` | "Não foi possível carregar as flags" + "Tentar novamente" |
| Admin — Feature flag — usuários | `gJQrD` | `/painel/flags/[key]`: back link, header with the "Para todos" switch, the add form (number + Ligado/Desligado dropdown + "Adicionar"), the per-user table (switch, remove), one row pending ("Removendo…"), a success toast |
| Admin — Feature flag — usuários vazio, número inválido | `oONTU` | No user settings, and the number field's error "Digite um número de usuário válido" |
| Admin — Feature flag — carregando | `MzesP` | Description skeleton, switch disabled, skeleton rows |
| Admin — Feature flag — não existe mais (404) | `vJYcq` | "Flag não encontrado" + "Voltar para Feature flags" |
| Avisos (toasts) — Feature flags | `z4yUNx` | Success and error toasts for immediate saves, and a "flag no longer exists" toast |

**Copy rule (owner, 2026-11-20): dialogs and toasts use generic copy; the only per-flag text is
the flag's description.** There will be dozens of flags, so no dialog, toast or other screen text
explains what a particular flag does or what happens when it changes. The admin knows that. The
key may appear (in the monospace style), and the description is developer-written data shown as
sent (R3). The spec must not introduce a per-flag copy map. The frames follow this rule: both
confirmations, the save error, the toasts and the 404 state are generic.

Choices made in the draft that the owner may want to change:
- Option A (detail route) for the per-user list (W5).
- The ON/OFF choice on add uses the existing `Dropdown` ("Configuração": Ligado/Desligado), and a
  user row flips with a `Switch`. No new kit component.
- The flag key is shown in a monospace font (W10). A list row's action is "Ver usuários".
- No phone frame: the admin panel is used on a computer, and the `fXng6` row pattern applies
  unchanged. The spec can ask for one if the owner wants it.

### 5. Data fetching and cache invalidation

**W7 (Medium). Query keys, invalidation and the client-side search.**
- **What:**
  - One new key `adminKeys.featureFlags()`. The list carries each flag's user settings (A1), so
    the Option A detail route selects its flag from that query and needs no key of its own.
  - Each write returns the updated flag (A1). Flag writes no longer touch the history (R23
    withdrawn), so `adminKeys.actions()` is not invalidated.
  - Search (R4) is a client filter over a few rows: no debounce and no request.
- **Where:** `src/lib/api/admin.ts:46-65`; new `src/lib/admin/featureFlags.ts`; PRD R3, R4, E7.
- **Why it matters:** The count column (R3) and the per-user rows are stale after a write unless the
  list query reflects it.
- **Recommendation:**
  - On every flag write, invalidate `adminKeys.featureFlags()` only, never `["admin"]`, following
    the repo's invalidate-by-key rule. The returned flag can drive the success toast. Writing it
    into the cache by hand is unnecessary for a list this small.
  - Filter with a pure function: trim, case- and accent-insensitive (`normalize("NFD")`), matching
    key or description, unit-tested.
  - Keep `?q=` in the URL like the other admin pages (`router.replace`).
  - Default `staleTime` is fine.

### 6. API client and validation

**W6 (Medium). The user number: validation and no identification.**
- **What:**
  - R17 accepts any number, but the API refuses zero and negatives (API dimension 7).
  - The PRD forbids showing whose number it is.
  - The admin panel's usual user rendering is a link to `/painel/usuarios/:id`
    (`HistoryContent.tsx:48-55`), and opening a profile writes a `VIEW_USER_PROFILE` entry and
    shows the person (`admin.ts:81-87`).
- **Where:** new `featureFlagUserSchema` in `src/lib/validation/admin.ts`; `historyFiltersFromParams`'
  `positiveId` (`src/lib/admin/history.ts:16-20`); PRD R17, E3, E4.
- **Why it matters:** A non-positive or unsafe number would come back as a 400 with generic copy.
  A profile link from a flag's user row would identify the user, contradicting R17
  and §6 out-of-scope.
- **Recommendation:**
  - Use a Zod schema with digits only, a positive safe integer and the message "Digite um número de
    usuário válido". Reuse `positiveId`'s regex by extracting it to a shared helper.
  - Render users as plain "Usuário #N" everywhere on this page, never as a link.
  - Response types go in `types.ts` as aliases over `Schemas[...]`.

### 7. Error handling and session edges

**W8 (Medium). Immediate saves need per-row pending state and a NOT_FOUND path.**
- **What:**
  - Add, change and remove save at once (R14), so there is no dialog to hold an error or block a
    double click.
  - A flag removed by developers while the page is open (E9) answers NOT_FOUND.
  - A detail route for an unknown key is also NOT_FOUND.
- **Where:** new `FeatureFlagsContent` / `FeatureFlagContent`; `src/lib/api/errorMessages.ts`;
  PRD R14, E9.
- **Why it matters:** Several things can go wrong:
  - A double click on "Adicionar" sends two upserts. That is harmless (R15), but it is a wasted
    request and two success toasts.
  - A per-row `Switch` flipped twice quickly can race.
  - A generic "Não encontrado" toast leaves a dead row on screen.
- **Recommendation:**
  - Disable the add button and the row's controls while their mutation is pending.
  - Show failures as an error toast keyed on `apiErrorMessage`.
  - On NOT_FOUND, refetch the list: on the detail route, show a "Flag não encontrado" message with
    a link back.
  - A 401 follows the existing `apiClient` hard navigation. Nothing is lost, since every save is
    already sent.

**W4 (High). The everyone switch must set an absolute value.**
- **What:** The `Switch` is controlled by server state. Clicking it opens `ConfirmDialog` with the
  target state ("Ligar para todos?"), and only a confirmed, successful call changes it. If the BFF
  route were a toggle, or the web sent `!row.enabled` computed at click time, a change saved by
  another admin in between (R25, E12) would be inverted rather than overwritten.
- **Where:** new everyone-switch handler; BFF route shape (A1); PRD R11, R12, R25, E12, E13.
- **Why it matters:** The admin confirmed "Ligar" and could end up with "Desligado".
- **Recommendation:**
  - The request body carries `enabled: <the state named in the dialog>`. The dialog's copy and the
    request both come from the same captured value.
  - After success, invalidate and refetch, so the row shows what was saved (last save wins, R25).
  - The switch never flips optimistically.
  - The same rule applies to a user row's ON/OFF `Switch` (an upsert with the absolute value).

### 8. State complexity

Nothing found. Checked: every interaction is one request, with no drafts, autosave, id remapping
or multi-step flow. It is plain `useQuery` plus `useMutation` with invalidation. The add form is
two fields: `react-hook-form` with the W6 schema, or controlled state, as `MuscleGroupsDialog`
does. Not `src/lib/workoutEditor`'s engine.

### 9. Copy and localization

Nothing found beyond W10. Checked:
- the page title "Feature flags" is the owner's term (PRD decisions);
- everything else is pt-BR: "Ligado"/"Desligado", "Todos", "Nenhuma flag encontrada" (E7, owner
  copy), and the count as "1 usuário"/"N usuários" (following `clientCountLabel`,
  `src/lib/admin/users.ts:20-22`);
- no history labels are needed (R23 withdrawn);
- the copy rule from dimension 4: dialogs and toasts use generic copy, and the only per-flag text
  is the flag's description. The confirmation is "Ligar para todos?" / "Desligar para todos?" with
  "A flag `KEY` ficará ligada/desligada para todos os usuários sem configuração própria. A mudança
  vale em até 1 minuto." A save error is "Não foi possível salvar. Tente de novo."

"Flag" is feminine everywhere (owner, 2026-11-20; Q3 closed): "A flag … ficará ligada", "Nenhuma
flag encontrada", "Não foi possível carregar as flags", "Flag não encontrada". "Ligado"/"Desligado"
are switch state labels and stay as they are.

### 10. Testing

See §6. There is no new pure-logic risk beyond the filter and the count label. Story-level
coverage of the two Content components is enough, matching how every other admin page is tested
(`HistoryContent.stories.tsx`, `ExercisesContent.stories.tsx`).

### 11. Performance and loading UX

Nothing found. Checked: the admin tables load through `DataTable loading` (skeleton rows), with
`keepPreviousData` only where paging exists. The flag list has no paging, so plain loading then
data. The everyone `Switch` and the row controls show pending through disabled state, and
`ConfirmDialog`'s button shows `loading`. React Compiler is on, so no manual memoization.

### History (withdrawn)

**W3 (withdrawn 2026-11-20).** It said the history could not render flag entries. With R23
withdrawn, flag changes are not recorded, so nothing changes in the history. **W9** (unknown
actions between the BFF and web deploys) is withdrawn with it. Both come back if history is added
later (PRD §6 deferred).

### AI assistant consumption (cross-reference)

**W11 (Info). R21's minute applies to the web's own copy of the AI flag.**
- **What:** When the AI assistant web feature ships, it hides its button while the flag is off for
  the trainer (ai-workout-assistant assessment F2, Q3: via a field the web already loads, such as
  `GET /auth/me`). That data is cached by the web (30 s `staleTime`, refetch on focus and mount)
  on top of the API's up-to-a-minute cache (API F2).
- **Where:** `docs/assessments/ai-workout-assistant/assessment.md` §8 Q3; `src/app/providers.tsx`;
  PRD R7, R21, E10.
- **Why it matters:** The windows add up to about 90 s in the worst case: slightly over "about a
  minute", not a defect. There is nothing to build on this page.
- **Recommendation:** The ai-workout-assistant web spec states the sum. The BFF is the place to
  return 403/404 if the flag turns off mid-session, so the web shows its "unavailable" state
  rather than trusting the cached field.

### 12. Effort, risk, and dependencies

See §7.

## 5. Options

Where a flag's user settings live (W5):

- **A. A detail route `/painel/flags/[key]`.** The list row links to it. It has its own header
  (key, description, the everyone switch), the add form and the users table. Long lists (R18) are
  fine, its loading and error states are independent, and it can be linked to. It costs one more
  page, but no extra BFF read: it selects its flag from the list query. **Preferred.**
- **B. A dialog over the list (`FeatureFlagUsersDialog`).** No new route. But it gets long with
  many users, nests a `Switch` and a `Dropdown` inside a `Dialog`, and is the first admin dialog
  that saves several independent writes.

The frames (Q1) settle it. Both read the same list query, since the settings are inline (A1).

## 6. Testing strategy

- **Stories (`storybook` Vitest project):**
  - `src/app/(admin)/painel/flags/FeatureFlagsContent.stories.tsx`:
    - default list;
    - search with a match, and with none (E7, "Limpar busca");
    - loading and error with "Tentar novamente";
    - the confirm dialog: Cancelar sends nothing (E13), confirm sends the dialog's state (W4);
    - a failed confirm keeps the dialog with its error.

    Uses a fetch stub, as `HistoryContent.stories.tsx` does.
  - `FeatureFlagContent.stories.tsx` (Option A):
    - add with ON and OFF;
    - an invalid number shows the field error and sends nothing;
    - replace an existing user (R15);
    - row switch and remove send once each, with controls disabled while pending;
    - empty list, NOT_FOUND, loading, error.
- **Unit (`unit` project):**
  - `src/lib/admin/featureFlags.test.ts` covers the filter (key, description, case, accents,
    trimmed, empty) and the count label.
  - `validation/admin.test.ts` covers the number schema (0, negative, decimals, letters, beyond
    `MAX_SAFE_INTEGER`).
  - `contract.test.ts` needs no change: no `AdminAction` values are added.
- **Nav:** no test today for `ADMIN_NAV`. The `activeAdminSection` prefix match for
  `/painel/flags/X` can be one unit case.
- **Pages:** `page.tsx` files stay untested, as in the rest of the panel. The risk here is in the
  Content components, which the stories cover.

## 7. Effort and risk

**Size M:**
- two client pages, or one plus a dialog;
- one wrapper module and type aliases;
- one validation schema, a small pure module;
- stories.

There is no state engine or new kit component.

**Dependencies, in order:**
1. vertice-api ships the RPCs.
2. vertice-bff ships the four routes, and `.bff-ref` is bumped here
   (W2, Blocker).
3. ~~The owner approves the drafted frames in section `tk2sX` (W1, Q1).~~ Done: design-ok, 2026-11-20.

Stories can be built against the documented contract before step 2 merges.

## 8. Questions and assumptions

- **Q1. (Owner, answered 2026-11-20: design-ok) Approve the drafted design frames.** Step 4 drafted 12 frames in section
  "Admin — Feature flags (feature-flags)" (`tk2sX`) of `Vertice Web.pen` (dimension 4). Approved by
  the owner (design-ok, 2026-11-20) after three revisions: generic confirm/toast copy, the
  add-user form aligned, "flag" feminine. The spec uses them, with Option A and the copy in dimension 9.
- **Q2. Route name.** Admin routes are Portuguese (`/painel/usuarios`, `/painel/exercicios`,
  `/painel/historico`), and the page name is "Feature flags". Assume `/painel/flags` (and
  `/painel/flags/[key]`).
- **Q3. Closed: feminine, owner 2026-11-20.** "Flag" is feminine everywhere ("a flag", "Nenhuma
  flag encontrada", "as flags"). "Ligado"/"Desligado" stay as switch state labels.
- **A1. BFF routes (from the vertice-bff assessment):**
  - `GET /api/admin/feature-flags` returns every flag with its user settings inline:
    `{ flags: [{ key, description, enabled, users: [{ userId, enabled }] }] }`. The row count (R3)
    is `users.length`.
  - `PUT /api/admin/feature-flags/:key/everyone` takes `{ enabled }`.
  - `PUT /api/admin/feature-flags/:key/users/:userId` takes `{ enabled }` (upsert).
  - `DELETE /api/admin/feature-flags/:key/users/:userId` removes the setting.
  - Each write returns the updated flag. All writes are absolute values (W4).
  - An unknown key is a 404 `NOT_FOUND` (W8).

  The wrappers call these as `/admin/feature-flags/...` through `apiClient`, which forwards
  `/api/bff/<path>` to the BFF's `/api/<path>`. `bffAllowList.ts:30-31` already allows `/admin/**`.

## 9. Inputs to the spec

- W2: build against the BFF spec's contract, and merge after the BFF and the `.bff-ref` bump.
  Write the wrapper in `src/lib/api/adminFeatureFlags.ts`.
- W1/Q1: build against the frames in section `tk2sX`, all **approved (design-ok, 2026-11-20)**:
  - list `ufeI3`;
  - search with results `tw3jw`, no match `A3vAb`;
  - confirm "Ligar para todos" `pGJVX`, confirm "Desligar" with save error `vBk8U`;
  - list loading `q1Y3N`, list error `Xp9eO`;
  - detail `gJQrD` (add form, per-user rows, pending row, toast);
  - detail empty with invalid number `oONTU`, detail loading `MzesP`, flag removed (404) `vJYcq`;
  - toasts `z4yUNx`.

  Implementation waits for owner approval.
- Copy: dialogs and toasts use generic copy; the only per-flag text is the flag's description. There is
  no per-flag copy map.
- W4: absolute-value writes, with the confirm dialog's captured target state as the request body;
  no optimistic flip.
- W5: Option A (detail route) unless the frames choose a dialog.
- W6: the number schema (a positive safe integer), and no profile links anywhere for flag users.
- W7: one key `adminKeys.featureFlags()`; writes invalidate only that key (not the history); a
  client-side, accent-insensitive filter, with `?q=` in the URL.
- W8: per-row pending and disabled controls, error toasts, and NOT_FOUND refetch or a "Flag não
  encontrado" state.
