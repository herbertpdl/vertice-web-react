# Spec (Web): Feature flags

Status: Draft. The implementation is built against this document and the BFF contract in §3; it
merges only after the BFF routes merge and `.bff-ref` is bumped (§11).
Design: design-ok. The owner approved the pen.dev section `tk2sX` "Admin — Feature flags
(feature-flags)" in `Vertice Web.pen` on 2026-11-20 (12 frames, listed in §6).
Owner: hebertpdl@gmail.com
Related: [vertice-api PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/feature-flags/prd.md)
(Approved 2026-11-20; R1–R29, E1–E15, not restated here; R23 withdrawn),
[vertice-api spec](https://github.com/herbertpdl/vertice-api/blob/main/docs/specs/feature-flags/spec.md)
(D1–D19),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/feature-flags/assessment.md)
(F5: the four admin routes) and the [vertice-bff spec](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/feature-flags/spec.md)
(FF1–FF10, the REST contract this app consumes; it wins over this document on any route, field
or code), this repo's
[assessment](../../assessments/feature-flags/assessment.md) (W1–W11, resolved in §0),
[`docs/specs/admin-panel/spec.md`](../admin-panel/spec.md) (the panel this page joins).
Ticket: [VRT-54](https://app.notion.com/p/41e61ad559a5818089b6d51021fe2b9f).

The web adds one admin section, "Feature flags": a list at `/painel/flags` and one flag's page at
`/painel/flags/[key]`. Both read one query, `GET /admin/feature-flags`, and write through three
absolute-value routes. It also shortens the workout editor's assistant-status query so a change
to `AI_ASSISTANT_ENABLED` reaches an open editor within about a minute (R21, E10). Who may read
or change a flag is enforced by the BFF and vertice-api; the web only never offers the page
outside the admin workspace, which the existing `(admin)` layout and proxy already do.

## 0. Scope decisions

Each row resolves an assessment finding (the Blocker W2, the High W4, and every Medium) or fixes
an owner decision.

Coverage: assessment §2, unchanged except the D-rows above.

| # | Decision | Resolves |
|---|---|---|
| D1 | **A generic switch, with no per-flag code.** The page knows no flag by name. Dialogs, toasts, helper text and empty states use the same copy for every flag (§5). The only per-flag text is the description, shown as sent. There is no per-flag copy map, guard, label or prerequisite check anywhere in the web. | Owner decision; API D1; R9, R10, R29, E14 |
| D2 | **The section is "Feature flags", between "Exercícios" and "Histórico" in `ADMIN_NAV`**, `href: "/painel/flags"`, icon `ToggleRight` from `lucide-react` (frame `ufeI3`'s `toggle-right`). Everything else on the page is pt-BR; "flag" is feminine ("a flag", "Nenhuma flag encontrada", "Flag não encontrada"). The key is shown as sent, in the monospace style of the frames, never translated. | R1, W10, Q2, Q3 |
| D3 | **The detail is a route, `/painel/flags/[key]`, reading from the list query (Option A).** `GET /admin/feature-flags` carries each flag's user settings inline, so the detail page finds its flag in the same query's data. There is no per-flag read. `activeAdminSection` already matches by prefix, so the nav item stays active. | W5, R13–R18 |
| D4 | **One query key, `adminKeys.featureFlags()` = `["admin", "feature-flags"]`.** Every flag write, on success, invalidates that key only, never `["admin"]` and never `adminKeys.actions()` (no history, R23 withdrawn), and ends its pending state only once **a fetch that started after its success has landed**, or one of §7's exits applies (`settleAfterWrite`): the dialog keeps its loading button, and a user row stays pending, until the list shows the saved state. Awaiting `invalidateQueries` alone is not enough: it defaults to `cancelRefetch: true`, so row B's save can cancel row A's refetch, and A would re-enable showing its old state, where a quick click would send the inverse of what A just saved. So a switch never shows a stale state after a success toast, and the cache is never edited by hand (the repo's invalidate-by-key rule). The returned flag is used only for the toast. Default `staleTime` (30 s) and focus refetch; no interval. | W7, R25 |
| D5 | **Every write sends an absolute state, and no switch flips before its save succeeds.** A `Switch` is always rendered from query data (`checked={flag.enabled}`), and its `onChange` never changes it. On a click, the handler captures the target state as the opposite of what the switch shows at that moment, and that captured value is both the dialog's copy and the request body (`{ enabled: target }`). A refetch while the dialog is open doesn't change the captured value: the admin confirmed "Ligar", so "Ligar" is sent. Last save wins (R25, E12). The same rule applies to a user row's switch, which has no dialog. | **W4 (High)**, R11, R12, R14, R25, E12, E13 |
| D6 | **The everyone switch asks first; user settings save at once.** The everyone switch, on the list rows and in the detail header, opens `FeatureFlagEveryoneDialog` (over `ConfirmDialog`, `cancelVariant="ghost"`). Cancel and Escape send nothing. Add, change and remove a user setting have no dialog. | R12, R14, E13 |
| D7 | **A user is added by a positive whole number, with no lookup and no identification.** `featureFlagUserIdSchema` accepts only digits forming a positive safe integer (`^[1-9]\d{0,15}$` and `Number.isSafeInteger`), after trimming. Anything else ("0", "-3", "1.5", "12a", "", leading zeros, past `Number.MAX_SAFE_INTEGER`) shows "Digite um número de usuário válido" and sends nothing. The add form has a "Configuração" `Dropdown` with "Ligado" (default) and "Desligado". A user is rendered as plain text "Usuário #N" (`String(n)`, no thousands separator) everywhere on these pages, never a link to `/painel/usuarios/:id`, whose read would identify the person and write a history entry. The same number again replaces the setting (the helper text says so). | W6, R13, R15, R17, E3, E4, E5, E15 |
| D8 | **The list's search is client-side, over key and description.** `filterFeatureFlags(flags, q)`: trimmed, case- and accent-insensitive (`normalize("NFD")`, combining marks removed, `toLocaleLowerCase("pt-BR")`), a substring of the key or the description. No debounce and no request. The query lives in the URL as `?q=` (`router.replace`, as `ExercisesContent` does), bounded by `ADMIN_SEARCH_MAX`. | R4, E7, W7 |
| D9 | **Per-row pending state, and every save single-flight.** "Adicionar" is disabled while its mutation is pending (plus a submitting ref, as `ConfirmDialog` does), so a double click sends one request. A user row's switch and remove button are **pending** while any mutation for that user number is pending (the add included). Pending means `aria-disabled="true"`, still focusable, and activation (click, Space, Enter) ignored; never the `disabled` attribute on a control that may hold focus, which would drop focus to `<body>`. The kit `Switch` only dims on `disabled`, so it gets the same dimmed, non-pointer style for `aria-disabled="true"` (one selector change in `Switch.tsx`, its story extended). A pending remove shows "Removendo…" with the `Spinner` in place of the row's actions (frame `gJQrD`). A pending switch stays at its old state. Different rows may save at the same time. Focus rules are in §10. | W8, R14 |
| D10 | **Errors: one generic save failure, one "flag gone" path.** A failed write shows "Não foi possível salvar. Tente de novo." (in the dialog for the everyone switch, frame `vBk8U`; as an error toast otherwise). A `NOT_FOUND` on any write means developers removed the flag (E9): the dialog closes, the toast says "Esta flag não existe mais. A lista foi atualizada.", and the list key is invalidated. On the detail page the refetched list no longer has the key, so the page shows "Flag não encontrada" (frame `vJYcq`). A detail URL whose key isn't in the list shows the same state. A 401 follows `apiClient`'s existing admin sign-out. The copy is keyed on `error.code` (`flagSaveErrorMessage` in `src/lib/admin/featureFlags.ts`), never on `error.message`; it is generic for every other code because the approved frames are. | W8, E9 |
| D11 | **The editor's assistant-status query follows the R21 budget.** `WorkoutEditor.tsx:101-106` (on `main` at c935896) changes from `staleTime: 5 * 60_000, retry: false` to `staleTime: 30_000, refetchInterval: 30_000, retry: 1` (`refetchIntervalInBackground` stays at its default `false`, so a hidden tab doesn't poll). Worst case about 60 s (API cache 30 s + interval 30 s); cost one status call per 30 s per open, visible editor. A failure before the first success hides the AI button; a later failed poll keeps the last data. **A flip to off never interrupts the assistant (§8.1):** `WorkoutEditorSession` latches the last `true` while the chat is busy, a proposal is in review or the panel is open, and applies `false` only once all three are idle; a flip to on applies at once. The two comments that name `AI_ASSISTANT_ENABLED` as a BFF env switch (`WorkoutEditor.tsx:99-100`, `assistant.ts:8`) are rewritten (§8). | W11, R7, R21, R22, R27, E10, E11 |
| D12 | **Built against the documented contract, merged after the BFF.** The wrappers and screens are written against §3 and developed with stories over a fetch stub. Types come only from the generated `schema.ts`: during development, `.bff-ref` points at the BFF implementation branch's commit and `npm run api:types -- --local` reads it; before merging, `.bff-ref` holds the BFF merge commit. No wire type is hand-written. | **W2 (Blocker)** |
| D13 | **No history, no reason, no create or delete.** `src/lib/admin/actions.ts`, `HistoryContent.tsx` and `contract.test.ts` don't change. No write takes a reason. The page has no control to create or delete a flag. | R9, R23 (withdrawn), R24 |

## 1. Routes and files

| Path | What |
|---|---|
| `src/app/(admin)/painel/flags/page.tsx` | Server. `metadata` title "Feature flags — Painel Vertice". Reads `searchParams.q` (first value, trimmed, cut to `ADMIN_SEARCH_MAX`) and renders `FeatureFlagsContent initialQuery`. |
| `src/app/(admin)/painel/flags/FeatureFlagsContent.tsx` | `"use client"`. The list (§6.1). |
| `src/app/(admin)/painel/flags/[key]/page.tsx` | Server. `const { key } = await params` (`PageProps<"/painel/flags/[key]">`); Next has already decoded the segment. `metadata` title "Feature flags — Painel Vertice". Renders `FeatureFlagContent flagKey={key}`. |
| `src/app/(admin)/painel/flags/[key]/FeatureFlagContent.tsx` | `"use client"`. One flag (§6.2). |
| `src/app/(admin)/painel/flags/FeatureFlagEveryoneDialog.tsx` | The confirmation, shared by both pages (§5). |
| `src/lib/api/adminFeatureFlags.ts` | The four wrappers (§3). |
| `src/lib/api/admin.ts` | `adminKeys.featureFlags`. |
| `src/lib/api/types.ts` | Aliases `FeatureFlag`, `FeatureFlagUser`, `FeatureFlagList` over the generated schemas. |
| `src/lib/admin/featureFlags.ts` | Pure helpers (§4). |
| `src/lib/validation/ids.ts` | `parsePositiveId(text): number \| undefined`, extracted from `history.ts`'s `positiveId`, which then calls it. |
| `src/lib/validation/admin.ts` | `featureFlagUserIdSchema` (D7). |
| `src/components/layout/AdminShell/nav.ts` | The new item (D2). |
| `src/components/domain/WorkoutEditor/WorkoutEditor.tsx`, `src/lib/api/assistant.ts` | D11. |
| `src/components/ui/Switch/Switch.tsx` | The dimmed style also for `aria-disabled="true"` (D9). |

Links to a flag are `/painel/flags/${encodeURIComponent(key)}`. The proxy, the `(admin)` layout's
role check and `bffAllowList` (`/admin/**` on the admin host) need no change.

## 2. Flows

**Everyone switch** (list row or detail header):
1. The admin clicks the switch. It doesn't move. `target = !flag.enabled` is captured.
2. `FeatureFlagEveryoneDialog` opens with `key` and `target`.
3. Cancelar or Escape: closed, nothing sent (E13).
4. Confirm: `PUT /admin/feature-flags/:key/everyone` `{ enabled: target }`, once. The button shows
   loading.
5. Success: the list is invalidated and refetched (D4), the switch shows the saved state, the
   dialog closes (offline, it closes at the latest 10 s after the save, `PAUSED_DEADLINE_MS` in
   §7, and the reconnect refetch corrects the row), the toast reads "A flag `KEY` foi ligada para todos." / "… desligada para todos."
6. Failure: `NOT_FOUND` → D10's "flag gone" path; anything else → the dialog stays open with
   "Não foi possível salvar. Tente de novo." and the admin can retry or cancel.

`ConfirmDialog` shows `errorMessage(error)` for any rejection. To close on `NOT_FOUND` instead,
`onConfirm` catches that one error and resolves `{ gone: true }`, and `onDone` handles both
outcomes.

**Add a user** (detail page): the admin types a number and picks "Ligado"/"Desligado", then
"Adicionar". An invalid number shows the field error and sends nothing. Otherwise
`PUT /admin/feature-flags/:key/users/:userId` `{ enabled }`. On success: the awaited
invalidation (D4), the toast "Usuário #N definido como Ligado." / "… Desligado.", the number field
cleared (the dropdown keeps its choice) and focus kept in the number field, ready for the next
number. The row appears in user-number order, as sent.

**Change a user** (row switch): `target = !row.enabled` captured on click; the same `PUT` with
`{ enabled: target }`; the same success toast; the row disabled while pending.

**Remove a user** (row trash button, `aria-label="Remover usuário #N"`): `DELETE
/admin/feature-flags/:key/users/:userId`. The row shows "Removendo…" until the result. On success
the toast reads "Usuário #N agora segue a configuração para todos." and the row is gone (R16, E6);
focus moves to the next row's switch (the previous row's when it was the last), or to the number
field when the list is now empty.

Every user-setting failure is an error toast (D10), with the row back to its saved state.

## 3. The BFF contract

From the BFF spec's FF7, FF8 and §2 (draft, written in parallel with this one; it matches the BFF
assessment's F5 and the API spec's D11–D13). If the merged BFF spec differs, it wins: only
`adminFeatureFlags.ts` and the aliases in `types.ts` change, since the screens use the aliases.
The aliases are `FeatureFlag = Schemas["AdminFeatureFlag"]`, `FeatureFlagList =
Schemas["AdminFeatureFlagList"]` and `FeatureFlagUser = FeatureFlag["users"][number]`.

| Wrapper | Route | Body | 200 |
|---|---|---|---|
| `fetchFeatureFlags()` | `GET /admin/feature-flags` | | `{ flags: FeatureFlag[] }` |
| `setFeatureFlagEveryone(key, enabled)` | `PUT /admin/feature-flags/:key/everyone` | `{ enabled }` | the updated `FeatureFlag` |
| `setFeatureFlagUser(key, userId, enabled)` | `PUT /admin/feature-flags/:key/users/:userId` | `{ enabled }` | the updated `FeatureFlag` |
| `removeFeatureFlagUser(key, userId)` | `DELETE /admin/feature-flags/:key/users/:userId` | | the updated `FeatureFlag` |

- `FeatureFlag` = `{ key: string, description: string, enabled: boolean, users: FeatureFlagUser[] }`;
  `FeatureFlagUser` = `{ userId: number, enabled: boolean }`. Flags ordered by key, users by
  `userId` (API D12). No count field: the count is `users.length`.
- `enabled` is a JSON boolean. No body carries a `reason`.
- `:key` is `encodeURIComponent(key)` (keys are `^[A-Z][A-Z0-9_]*$`, at most 64, API D4); `apiClient`
  and `bffProxyPath` already encode and check each segment.
- Errors: unknown key → 404 `NOT_FOUND`; a malformed key, a body that isn't exactly
  `{ enabled: boolean }`, or a `userId` that isn't digits with no leading zero forming a positive
  safe integer → 400 `VALIDATION_ERROR` (BFF FF8, the same rule as D7, so the form never sends
  one); no ADMIN session → 401/403 as
  for every admin route. Removing a number with no setting succeeds (API D13).

## 4. Pure helpers (`src/lib/admin/featureFlags.ts`)

- `filterFeatureFlags(flags, q)`: D8. An empty or whitespace `q` returns `flags` unchanged.
- `userCountLabel(n)`: "Nenhum usuário", "1 usuário", "N usuários" (list column "CONFIGURAÇÃO
  PRÓPRIA").
- `flagCountLabel(shown, total)`: "2 flags", "1 flag" when nothing is filtered; "1 de 2 flags",
  "0 de 1 flag" when a search is active (the noun follows `total`).
- `userLabel(userId)`: "Usuário #N".
- `everyoneToast(key, enabled)`, `userSetToast(userId, enabled)`, `userRemovedToast(userId)`: the
  toast texts in §5.
- `flagSaveErrorMessage(error)`: `NOT_FOUND` → the "flag gone" text, anything else → the generic
  save failure (D10).

## 5. Copy

All from the approved frames. `KEY` is the flag's key in the monospace style; `N` a user number.

| Where | Text |
|---|---|
| Nav, page title, back link | "Feature flags" |
| List subtitle | "Ligue ou desligue partes do produto para todos ou para usuários específicos. As mudanças valem em até 1 minuto." |
| Search | label "Buscar", placeholder "Buscar por nome ou descrição" |
| List columns | "FLAG", "PARA TODOS", "CONFIGURAÇÃO PRÓPRIA", and an unlabelled action column with "Ver usuários" |
| Switch state | "Ligado" / "Desligado" next to every switch |
| No match (E7) | "Nenhuma flag encontrada", "Confira o texto, ou limpe a busca.", button "Limpar busca" |
| List error | "Não foi possível carregar as flags", "Verifique sua conexão e tente novamente.", "Tentar novamente" |
| Confirm, on | title "Ligar para todos?", body "A flag `KEY` ficará ligada para todos os usuários sem configuração própria. A mudança vale em até 1 minuto.", primary "Ligar para todos" |
| Confirm, off | title "Desligar para todos?", body with "desligada", danger "Desligar para todos" |
| Detail header | "Para todos", helper "Vale para quem não tem configuração própria. Pede confirmação." |
| Add form | title "Dar configuração própria a um usuário", "Número do usuário", "Configuração", "Adicionar", helper "O número não é conferido e o nome do usuário não aparece aqui: confira antes de adicionar. Se o usuário já tiver configuração própria, ela é substituída." |
| Invalid number | "Digite um número de usuário válido" |
| User table | title "Usuários com configuração própria" with the count; columns "USUÁRIO", "CONFIGURAÇÃO"; rows "Usuário #N"; pending "Removendo…" |
| No user settings | "Nenhum usuário com configuração própria", "Todos seguem a configuração para todos." |
| Flag gone (404 page) | "Flag não encontrada", "Ela pode ter sido removida do produto. As outras flags continuam na lista.", link "Voltar para Feature flags" |
| Toasts | "A flag `KEY` foi ligada para todos." / "… foi desligada para todos."; "Usuário #N definido como Ligado." / "… Desligado."; "Usuário #N agora segue a configuração para todos."; error "Não foi possível salvar. Tente de novo."; error "Esta flag não existe mais. A lista foi atualizada." |

A list with no flags at all (and no search) shows "Nenhuma flag encontrada" with no
second line and no button. That state has no frame and can't happen while the two seeded flags
exist (R26). Their seed states are R28 as corrected by vertice-api#104: `AI_ASSISTANT_ENABLED`
on for everyone, `FIRST_ACCESS_EMAIL_ENABLED` off, no user settings (BFF spec FF14). The page
shows whatever the list returns, so nothing here depends on them.

## 6. Screens

### 6.1 List (`FeatureFlagsContent`; frames `ufeI3`, `tw3jw`, `A3vAb`, `pGJVX`, `vBk8U`, `q1Y3N`, `Xp9eO`)

- Title block, the search `TextField` (`maxLength={ADMIN_SEARCH_MAX}`), then a `DataTable` card.
- Each row: the key (monospace) over the description (as sent, wrapped); the everyone `Switch`
  with its state label and `aria-label="Para todos: KEY"`; `userCountLabel(users.length)`; a
  "Ver usuários" button-styled `Link` to the detail page. `mobileRow` follows the `fXng6` pattern
  used by the other admin tables (key, state, count, link).
- Footer: `flagCountLabel`.
- Loading: `DataTable loading` (`U8EYgf` rows). Error: `DataTableMessage` with the list error copy
  and "Tentar novamente" (`refetch`). No match: `DataTableMessage` with "Limpar busca", which
  clears the field and `?q=`.
- While the dialog's save is pending, the row's switch is pending (`aria-disabled`, D9). The
  dialog returns focus to that switch when it closes.

### 6.2 One flag (`FeatureFlagContent`; frames `gJQrD`, `oONTU`, `MzesP`, `vJYcq`, toasts `z4yUNx`)

- Back link "Feature flags" (`arrow-left`) to `/painel/flags`, keeping no search.
- Header: the key (from the URL while loading, then from data), the description, and a card
  with "Para todos", the switch, its state label and helper text.
- The add form (D7): the number `TextField` (`inputMode="numeric"`), the `Dropdown`, "Adicionar".
  Controlled state or `react-hook-form` with `featureFlagUserIdSchema`; values read with
  `useWatch`, never `watch()`. The form is disabled until the flag is loaded.
- "Usuários com configuração própria" with the count, then a `DataTable` of the user settings:
  "Usuário #N", the row `Switch` (`aria-label="Configuração de usuário #N"`) with its state label,
  and the remove button (`trash-2`). Empty: "Nenhum usuário com configuração própria" (`oONTU`).
- Loading (`MzesP`): the key from the URL, a skeleton description, skeleton rows, and in the
  "Para todos" card the frame's dimmed switch track with "—". That placeholder is not a switch: it
  is `aria-hidden`, and the card carries `aria-busy="true"` with a visually hidden "Carregando
  configuração para todos", so no assistive technology announces an "off" state that isn't known
  yet. The real `Switch` replaces it once the flag is loaded.
- The list query failing: the header's key from the URL, then the list error message with
  "Tentar novamente" in place of the body (no frame; it reuses `Xp9eO`'s copy).
- The key not in the loaded list: the `vJYcq` state only (no form, no table), with the back link.
  When the page turns into this state after a write's 404, focus moves to its heading "Flag não
  encontrada" (`tabIndex={-1}`), since the control that held it is gone.

## 7. Data fetching

| Query / mutation | Key | Notes |
|---|---|---|
| `fetchFeatureFlags` | `adminKeys.featureFlags()` | Both pages. Default `staleTime` and focus refetch. No `keepPreviousData` (no paging). |
| `setFeatureFlagEveryone` | | On success and on `NOT_FOUND`: `await settleAfterWrite(queryClient)` before the pending state ends (D4). |
| `setFeatureFlagUser`, `removeFeatureFlagUser` | | Same. |

`settleAfterWrite` (in `src/lib/api/adminFeatureFlags.ts`). Every pass of its loop either
waits for a real event (a fetch settling, a cache update) or returns, so it can't spin:

```ts
const MAX_REFETCHES = 3;
/** How long a paused (offline) query may hold a save's pending state after the write succeeded. */
const PAUSED_DEADLINE_MS = 10_000;

export async function settleAfterWrite(queryClient: QueryClient) {
  const queryKey = adminKeys.featureFlags();
  const issuedAt = Date.now(); // after the write's response: the server has committed
  const deadline = issuedAt + PAUSED_DEADLINE_MS;
  await queryClient.invalidateQueries({ queryKey, exact: true });
  for (let refetches = 0; ; ) {
    // Gone (the page unmounted and it was collected, or sign-out's `queryClient.clear()`).
    const query = queryClient.getQueryCache().find({ queryKey, exact: true });
    if (!query) return;
    const before = query.state;
    if (before.dataUpdatedAt > issuedAt || before.errorUpdatedAt > issuedAt) return;
    if (before.fetchStatus === "paused") {
      // Offline: refetchQueries would resolve at once without fetching. Wait for the query to move.
      const remaining = deadline - Date.now();
      if (remaining <= 0) return; // the write is saved; the reconnect refetch corrects the row
      const woke = await Promise.race([
        nextUpdate(queryClient, query.queryHash).then(() => true),
        delay(remaining).then(() => false),
      ]);
      if (!woke) return;
      continue;
    }
    if (refetches === MAX_REFETCHES) return;
    refetches += 1;
    await queryClient.refetchQueries({ queryKey, exact: true }, { cancelRefetch: false });
    const after = query.state;
    const moved = after.dataUpdatedAt !== before.dataUpdatedAt || after.errorUpdatedAt !== before.errorUpdatedAt;
    if (!moved && after.fetchStatus === "idle") return; // nothing ran and nothing will
  }
}

/** Resolves after `ms` (a plain `setTimeout`, so fake timers drive it in tests). */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves on this query's next `updated` (or `removed`) cache event. */
function nextUpdate(queryClient: QueryClient, queryHash: string): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash !== queryHash) return;
      if (event.type === "updated" || event.type === "removed") {
        unsubscribe();
        resolve();
      }
    });
  });
}
```

Why `dataUpdatedAt > issuedAt` proves freshness: `invalidateQueries` (default `cancelRefetch:
true`) cancels any fetch in flight at `issuedAt` and starts a new one, and a cancelled fetch never
writes data. So data that lands strictly after `issuedAt` comes from a fetch started after the
write committed; the comparison is strict so a fetch landing in the same millisecond is not
trusted (it costs at most one more refetch). Inside the loop, `cancelRefetch: false` joins a fetch
already in flight, which by the same argument started after `issuedAt`. When another write's
invalidation cancels ours, `refetchQueries` resolves while the new fetch runs (`fetchStatus`
`"fetching"`), so the next pass joins it.

Exits, each without a busy loop: fresh data or an error after `issuedAt` (a failed refetch: the
row re-enables and the list shows its error state); the query gone; a refetch after which nothing
moved and nothing is fetching; three refetches; the paused deadline. A paused (offline) query
waits on the cache subscription and doesn't count toward the cap; back online, TanStack resumes
the fetch, whose `updated` event wakes the loop. That wait is the only one without its own end,
so it races `PAUSED_DEADLINE_MS` (10 s from `issuedAt`): past it, the function returns like the
other give-ups, since the write itself already succeeded. Only the paused wait can hit the
deadline; refetches are bounded by the cap. The race's losing `nextUpdate` subscription stays
until the query's next update or removal, which is harmless. A row that exits without fresh data re-enables on the data it has;
the next focus or reconnect refetch corrects it.

Starting a mutation counts as an interaction for `useAdminSession`'s renewal, as every admin
mutation already does.

## 8. The workout editor (D11)

`WorkoutEditor.tsx` on `main` at c935896, lines 99-106, becomes:

```tsx
  // Whether the assistant is on for this trainer: the `AI_ASSISTANT_ENABLED` flag, set on the admin
  // "Feature flags" page. Polled every 30 s while the tab is visible, so a change reaches an open
  // editor within about a minute. A failure before the first answer keeps the AI button hidden; a
  // later failed poll keeps the last answer. WorkoutEditorSession never turns it off mid-use.
  const { data: assistantStatus } = useQuery({
    queryKey: assistantStatusQueryKey,
    queryFn: fetchAssistantStatus,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });
```

`assistant.ts:8` becomes: `` /** `GET /assistant/status`: whether the `AI_ASSISTANT_ENABLED` flag is on for this trainer (the AI button's switch). */ ``.

Line 133 passes the server value as before, renamed `assistantAvailable={assistantStatus?.enabled === true}`
(the `WorkoutEditorSessionProps` field is renamed with it, stories included).

### 8.1 A flip to off while the assistant is in use

`assistantEnabled` gates four things in `WorkoutEditorSession` (c935896): `chatBusy` (:245, which
feeds `warnOnLeave` :284 and the "Concluir" confirm :374-376), `locked` (:246, the `inert` at
:515/:551/:601), the AI button (:543) and `AiChatPanel` (:768). `engine.propose` and the review
(:556) are not gated. A raw `false` arriving mid-build would therefore lift the lock and unmount
the panel while the proposal still lands in a now-unlocked editor.

So the session derives the effective value from the server's, during render (no effect):

```tsx
const [assistantEnabled, setAssistantEnabled] = useState(assistantAvailable);
const assistantInUse = isBusy(chatState) || state.review !== null || panelOpen;
if (assistantAvailable && !assistantEnabled) setAssistantEnabled(true);           // on: at once
if (!assistantAvailable && assistantEnabled && !assistantInUse) setAssistantEnabled(false); // off: once idle
```

`chatState`, `state` and `panelOpen` are declared before it, and everything at :245-:768 reads
`assistantEnabled` as today. While the latch holds `true`, the trainer may send again: the BFF
answers 503 `AI_UNAVAILABLE`, which the panel already shows as its "unavailable" state. Closing
the panel (with the chat idle and no review) then hides the button.

Focus when that close hides the button: `AiChatPanel`'s `onClose` (:775-778) focuses
`aiButtonRef`, but the button unmounts in the same render, which would drop focus to `<body>`.
`onClose` therefore decides before the render, from the same inputs as the latch:

```tsx
onClose={() => {
  setPanelOpen(false);
  const buttonGoes = !assistantAvailable && !isBusy(chatState) && state.review === null;
  if (!buttonGoes) aiButtonRef.current?.focus();
  else if (!atCap) addExerciseRef.current?.focus(); // "+ Adicionar exercício", always rendered
  else nameFieldRef.current?.focus();               // at the cap that button is disabled
}}
```

`addExerciseRef` goes on the "+ Adicionar exercício" `Button` in `headerActions` (:468) and
`nameFieldRef` on the workout name `TextField`; both components already forward refs. The editor
has no header heading, so the first always-present header control is the target. The
`AssistantTurnedOffWhileBuilding` story ends by closing the panel and asserting focus is on
"+ Adicionar exercício".

## 9. Tests

**Unit (`unit` project):**
- `src/lib/admin/featureFlags.test.ts`: the filter (key, description, case, accents both ways,
  trimmed, empty, no match), `userCountLabel` (0, 1, 2), `flagCountLabel` (filtered and not,
  singular total), `flagSaveErrorMessage`
  (`NOT_FOUND`, `VALIDATION_ERROR`, a non-`ApiError`).
- `src/lib/validation/admin.test.ts`: `featureFlagUserIdSchema` accepts "1", " 57 ", "9007199254740991";
  refuses "", "0", "-3", "1.5", "12a", "1e3", "007", "9007199254740992".
- `src/lib/validation/ids.test.ts`: `parsePositiveId`; the history filters keep their behaviour.
- `src/lib/api/adminFeatureFlags.test.ts`: `settleAfterWrite` with a real `QueryClient` and a
  stubbed `queryFn` (no React): (1) the first refetch is cancelled by a second invalidation, then
  data arrives: it resolves once that data lands, not before; (2) `onlineManager.setOnline(false)`
  before it runs: it doesn't spin (the `queryFn` is called at most once, the promise stays pending
  across fake-timer advances shorter than `PAUSED_DEADLINE_MS`), and resolves after
  `setOnline(true)` lets the fetch land; (2b) offline, fake timers advanced past
  `PAUSED_DEADLINE_MS`: it resolves without going back online, and the `queryFn` was not called again; (3) the
  query removed (`queryClient.removeQueries`) or never created: it resolves at once. Plus: with the
  fake clock frozen at `issuedAt`, so no landing is strictly newer, it stops after three refetches, and a failing `queryFn`
  resolves on the error.
- `contract.test.ts`: unchanged (D13).

**Stories (`storybook` project, fetch stub as in `HistoryContent.stories.tsx`):**
- `FeatureFlagsContent.stories.tsx`: default; search with a match (`?q=assistente`); no match and
  "Limpar busca"; loading; error and retry; the switch opens the dialog without moving; Cancelar
  sends nothing; confirm sends `{ enabled: true }` for an off flag once, even after a refetch that
  turns it on in between (W4); a failed confirm keeps the dialog with its error; a 404 closes it
  with the "flag gone" toast.
- `FeatureFlagContent.stories.tsx`: default with users; add Ligado and Desligado (request body
  and toast); an invalid number shows the error and sends nothing; a double click on
  "Adicionar" sends one request; adding an existing number replaces its row; a row switch sends
  the opposite of what it shows and stays put until the response; remove shows "Removendo…" and
  sends once; empty; loading; list error; unknown key; a 404 on a write leads to "Flag não
  encontrada"; **two rows saved at once**: row A's `PUT` resolves, row B's `PUT` is sent while the
  list refetch for A is held, B's invalidation cancels it; A stays pending (switch unchanged, no
  toast) until a list response with A's saved state lands, then re-enables showing it;
  **keyboard**: Tab to a row switch, Space; the switch is `aria-disabled`, keeps focus, and a
  second Space sends nothing; after the response and refetch it shows the new state and still has
  focus; a keyboard remove moves focus to the next row's switch, and removing the last row moves
  it to the number field.
- `WorkoutEditorSession.stories.tsx` gains `AssistantTurnedOffWhileBuilding`: `assistantAvailable`
  starts `true`, the trainer sends, and while the stub stream is in `building` the story re-renders
  with `assistantAvailable={false}`. The editor stays locked (`inert`), the panel stays open, the
  proposal reaches review; after discarding it and closing the panel, the AI button is gone and focus is on
  "+ Adicionar exercício". The
  existing stories pass the renamed prop. The query options themselves (interval, retry) are not
  story-tested.

Pages stay untested, as in the rest of the panel.

## 10. Accessibility

Each switch is the kit `Switch` (`role="switch"`) with an `aria-label` naming its flag or user
number; the visible "Ligado"/"Desligado" label is text, not color alone. The remove button has an
`aria-label`. Toasts use `Toast`'s existing live region. The dialog is `ConfirmDialog`.

Focus never falls to `<body>` during a save:
- Pending controls are `aria-disabled`, not `disabled` (D9), so a switch toggled with Space keeps
  focus through the request and the refetch.
- After a remove, focus goes to the next row's switch, else the previous row's, else the number
  field.
- After an add, focus stays in the number field.
- After the everyone dialog closes, focus returns to the switch that opened it.
- When the detail page becomes "Flag não encontrada", focus moves to that heading.

## 11. Merge and deploy order

1. vertice-api ships the feature-flag RPCs and migration.
2. vertice-bff ships the four admin routes (and the assistant changes) and regenerates
   `docs/openapi.json`.
3. This repo: `.bff-ref` set to the BFF merge commit, `npm run api:types`, typecheck, merge. CI's
   `api:types -- --check` keeps a stale pin out.

Until step 2 merges, the work lives on a branch built against the BFF implementation branch's
commit (D12) and its stories. The editor change (D11) ships in the same PR: it changes no
contract (`GET /assistant/status` keeps its `{ enabled }` shape), and it only matters once the BFF
reads the flag, which step 2 delivers.

Rollback: reverting the web PR removes the page and restores the 5-minute status query; the
flags keep their saved state and the BFF and API need nothing. Rolling the BFF back first would
leave the page answering errors (404 on its routes), so the web is reverted first.

## 12. Out of scope

- Flag changes in the admin history (R23 withdrawn; PRD §6 defers it). If added later, the
  `AdminAction` maps and the "Afetado" column need a plain "Usuário #N" for numbers with no
  account (assessment W3).
- Creating or deleting flags, percentage rollout, groups, a reason field, identifying a user
  number.
- Any trainer-side consumer other than the editor's AI button; the mobile app.
- A phone layout beyond the existing `mobileRow` pattern (the panel is used on a computer).
