# Technical assessment (Web): Client Anamnese

Status: Draft
Owner: hebertpdl@gmail.com
Related: source PRD [vertice-api `docs/prds/client-anamnese/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/client-anamnese/prd.md)
(`R1`–`R42`, `E1`–`E25`; there is no web PRD for this slug),
[vertice-api assessment](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/client-anamnese/assessment.md)
(its findings are cited as `API-F#`), vertice-bff assessment (being written in parallel, will be
`https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/client-anamnese/assessment.md`),
[AI assistant PRD](../../prds/ai-workout-assistant/prd.md) and
[spec](../../specs/ai-workout-assistant/spec.md) (the panel and chat this changes; rules cited as
`AI-R#`)
Spec: not yet written (will be `docs/specs/client-anamnese/spec.md`)

## 1. Summary

Overall risk: **Medium**.

**Design gate: not cleared.** There is no web PRD for this slug, but the source PRD's header
says `Design: pending — pen.dev frames in Vertice Web.pen, section "Web — Anamnese do aluno
(client-anamnese)"`. Screens change (a new tab, a roster badge, two panel notices, a chat line),
so this repo's design gate (CLAUDE.md, "Design gate") applies: no implementation until the owner
approves the frames. The frames already exist in section `c1tY9` (10 frames, listed in §9). This
assessment did not draft or change any frame: the run was read-only on the design file. The
frames cover the main states but not loading, load error, saving, save error, E25 (two lines
after a proposal) or the former-trainer panel (F10). They need the owner's approval, and those
states need adding first.

**What it touches:**
- a new "Anamnese" tab on `/alunos/[studentId]` (`StudentDetailContent.tsx`), with an
  explicit-save form, a counter, and a leave warning;
- a "Sem anamnese" badge on the roster (`AlunosContent.tsx`);
- a fixed strip at the top of `AiChatPanel`, which opens the tab in a new browser tab;
- a separate conflict line in the chat stream (`src/lib/assistant/chat.ts`);
- the `/privacidade` text (R33), which is a launch condition, not a follow-up.

**Top risks:**
- Leaving with unsaved changes (R15) has no reusable guard in this app. The App Router can't
  veto a route change, the only precedent uses `window.confirm` and not the designed dialog, and
  back/forward can't be caught at all (F4).
- A background refetch must never overwrite the trainer's draft. The query defaults
  (`staleTime` 30 s, refetch on window focus) make this happen by default with a naive form
  (F5).
- The conflict line (R30, R31) needs a signal in the stream that the web can tell apart from
  AI-R51's line. The chat store also merges every `text` delta after a proposal into one bubble
  today (F6).
- The privacy text has to merge before the BFF or the web expose the feature, and four of its
  sentences are contradicted by the anamnese (F7).

**Recommended approach:**
- The tab is a colocated `AnamneseTab.tsx` with plain local draft state, a single save
  mutation, and no autosave engine. The tab goes into the URL (`?aba=anamnese`), so R28's link
  can open it.
- A shared `useLeaveGuard` hook covers tab switches, in-app links (capture-phase interception
  opening the designed dialog), and `beforeunload`.
- A `conflict` line kind in the chat store, rendered with the warning icon.

| Id | Severity | One line |
|---|---|---|
| F1 | Blocker | Design gate: the source PRD says `Design: pending`; the 10 frames in `c1tY9` exist but aren't approved, and some states are missing (F10) |
| F2 | Blocker | No BFF route exists yet: `GET`/`PUT /api/clients/:clientId/anamnese`, `ClientSummary.hasAnamnese` and the stream's conflict line (pinned BFF `2044475` has none) |
| F4 | High | R15 needs a leave guard for tab switches, in-app links and unload, with the designed dialog; the editor's precedent is `window.confirm`, and back/forward can't be vetoed |
| F5 | High | The draft must survive background refetches (window focus, 30 s `staleTime`) and must rebase only on its own save |
| F6 | High | The conflict line needs its own stream signal and chat-store kind; today every `text` after a `proposal` is appended to one bubble, which breaks R31/E25 |
| F7 | High | `/privacidade` must say the anamnese is stored and sent to Anthropic before BFF/web deploy (R33); sections 4, 5 and 7 have sentences the feature contradicts |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1 | existing: BFF/API authorization; the web only reacts to the 403 | `useRedirectOnError` on the student page already bounces a non-roster client (`StudentDetailContent.tsx:36`) |
| R2 | existing: the web is the only trainer client | Nothing in vertice-mobile |
| R3 | not applicable to the web | The web is trainers-only (`src/lib/auth/trainerOnly.ts`) |
| R4 | not applicable to the web | The admin pages never ask for it; nothing to add to `src/app/(admin)` |
| R5–R8 | not applicable to the web | API data model (API-F4). The web shows whatever the read returns |
| R9 | existing, must change: `StudentDetailContent.tsx:23, 158-183` | Fourth tab "Anamnese"; the tab moves into the URL (F3) |
| R10, R11 | new: `[studentId]/AnamneseTab.tsx` + `ANAMNESE_MAX` in `src/lib/validation/bounds.ts` | Counter in UTF-16 units, no `maxLength` attribute (F12); frame `h49po` |
| R12 | new: `AnamneseTab` | Explicit "Salvar", disabled when nothing changed or over the limit (design note); not the editor's autosave engine (F5, §5) |
| R13 | not applicable to the web | The server overwrites |
| R14 | new: `AnamneseTab` | "Atualizada em dd/mm/aaaa" from the `updatedAt` instant through `formatInstantDate` (`src/lib/format.ts:142`), never `formatDateNumeric` (that one is for business dates) |
| R15 | new: `src/lib/hooks/useLeaveGuard.ts` + `ConfirmDialog` | F4; frames `ik5C5`, `QSfhj` |
| R16 | new: `AnamneseTab` side card "Para que serve a anamnese" | Copy fixed in the design; F9 on "Só você vê" |
| R39 | new: `AnamneseTab`, reads `assistantStatusQueryKey` (`src/lib/api/assistant.ts:6`) | The AI sentence shows only when `enabled === true`; frames `dqvZj` vs `tIQlg` (F13) |
| R17, R18 | new: `AnamneseTab` "O que escrever" list | Static copy; the text box is free (no template, placeholder only) |
| R19 | new: `isBlankAnamnese` in `src/lib/validation/anamnese.ts` | A blank save returns the E1 state; the definition mirrors the API's (API-F6, F12) |
| R20 | not applicable to the web | Last write wins on the server; the web adds no conflict check (F5 explains why a refetch must not overwrite) |
| R21 | existing, must change: `AlunosContent.tsx:156-165` | `Badge variant="warning"` "Sem anamnese" next to "Suspenso"; frame `iDTb7` (F14) |
| R22 | not applicable to the web | The BFF reads the anamnese per message from `trainingPlanId`; the web's `WorkoutChatRequest` doesn't change and must never carry the text |
| R23, R24 | not applicable to the web | Model behaviour, BFF whitelist |
| R40 | not applicable to the web | AI contract and docs |
| R25 | existing, must change: `AiChatPanel.tsx:184-206` (new strip under the header) | Fed by `WorkoutEditor.tsx` (`clientId`, `studentName` already loaded, `:86-90`); frame `iIb3w` (F8) |
| R26 | same | "Preencher anamnese" variant; frame `k1OeP5` |
| R27 | existing | The chat is unchanged; the notice doesn't gate "Enviar" |
| R28 | `AiChatPanel` link with `target="_blank" rel="noopener noreferrer"` to `/alunos/:id?aba=anamnese` | Needs F3. The editor's link interceptor already ignores `target="_blank"` (`WorkoutEditor.tsx:325`), so the chat and a review are never disturbed |
| R29 | not applicable to the web (BFF reads per message) | The panel strip has to refresh too, or it contradicts E5/E13 (F8) |
| R30, R31 | existing, must change: `src/lib/assistant/contract.ts:35-40, 105-143`, `chat.ts:237-246, 286-290`, `AiChatPanel.tsx:26-101` | F6; frame `x9k4ZI` |
| R32, R41, R42 | not applicable to the web, except through the privacy text | F7 |
| R33 | existing, must change: `src/app/privacidade/page.tsx:98-180`, `LEGAL_TEXT_DATE` in `src/lib/legal/versions.ts` | F7, launch-gating |
| R34 | not applicable to the web | Legal review |
| R35, R36 | existing, no change: `GET /auth/me/export` download | The file is the API's; the web already saves it (`apiClient.download`) |
| R37, R38 | not applicable to the web | API deletion |
| E1 | `AnamneseTab` empty state | Frame `dqvZj` |
| E2 | `AnamneseTab` over-limit state | Frame `h49po`; a paste must not be truncated (F12) |
| E3, E24 | `useLeaveGuard` | F4 |
| E4 | `AnamneseTab` | Stored as typed; the web doesn't trim the stored value (API-F6) |
| E5 | roster badge + panel notice after a blank save | Invalidate `["students"]` and the anamnese key on save (F11); the panel refetches (F8) |
| E6 | server | The web must not "fix" it client-side |
| E7, E8 | not applicable to the web | — |
| E9, E10 | not applicable to the web | — |
| E11, E12 | `AiChatPanel` strip | F8 |
| E13 | new browser tab + panel refresh | F3, F8 |
| E14 | not applicable to the web | The other tab's draft is never sent (BFF reads the saved text) |
| E15, E25 | chat store + panel | F6; E25 has no frame (F10) |
| E16, E17 | not applicable to the web | Model / BFF |
| E18–E20, E22, E23 | not applicable to the web | API |
| E21 | `AnamneseTab` with the assistant off | Frame `tIQlg` |

## 3. Current state

**Student page.** `page.tsx:3-9` passes only `studentId` (no `searchParams`).
`StudentDetailContent.tsx` keeps the active tab in `useState<Tab>("plans")` (`:23, :26`) and
renders three tabs from an inline array (`:158-183`). Every tab is a colocated component
(`PlansTab`, `FeedbackTab`, `ProgressTab`). The header has "Encerrar acompanhamento", which does
`router.push("/alunos")` after the dialog (`:104-109`), and a "Voltar" `Link` to `/alunos`
(`:62-68`). A 403/404 on the overview bounces to `/alunos` (`:36`).

**Roster.** `AlunosContent.tsx` reads `["students"]` (`:38`). Each row is a `Link` with the
avatar, the name and a "Suspenso" `Badge variant="danger"` (`:149-165`), in a fixed-width
column (`COLUMN_WIDTHS.student`, `:23`). `AlunosContent.stories.tsx` already tests the page
with a seeded roster.

**Assistant panel.** `AiChatPanel` (`src/components/domain/AiChatPanel/AiChatPanel.tsx`) is
presentational: header (`:184-206`), message log (`:208-245`), composer (`:247-313`). It knows
nothing about the client. `WorkoutEditor.tsx` already loads the plan and the student (name)
(`:82-90`). It polls `GET /assistant/status` every 30 s (`:105-111`). `AssistantStatus` is
`{ enabled: boolean }` only (`schema.ts:1712-1715`). The chat store appends every `text` event
to the open text bubble. That bubble is reset only by a `stage` or a `proposal` (`chat.ts:237-246,
270, 288`), so two lines after a proposal would merge. `parseAssistantEvent` drops unknown event
names (`contract.ts:140-142`).

**Leave warnings.** Only the workout editor has them (`WorkoutEditor.tsx:296-340`):
- `beforeunload` for reload and close;
- a capture-phase `document` click interceptor for same-origin `a[href]` that asks with
  `window.confirm`. It skips modifier clicks and `target="_blank"`.

The comment there states the constraint: "the App Router has no route-change event to veto".
Nothing intercepts `router.push` (e.g. `useSignOut`, `src/lib/auth/useSignOut.ts`) or browser
back/forward.

**Forms and bounds.**
- `TextArea` (`src/components/ui/TextArea/TextArea.tsx:43`) is a fixed `h-[104px] resize-none`
  box with no counter.
- The only counter in the app is the chat composer's (`AiChatPanel.tsx:292-312`, UTF-16 via
  `messageLength`).
- `src/lib/validation/bounds.ts` holds every mirrored length bound in UTF-16 units (`maxUnits`).

**Query defaults.** `src/app/providers.tsx`: `staleTime: 30_000`, `retry: 1`, and TanStack's
default `refetchOnWindowFocus: true`.

**Upstream.** `src/lib/api/.bff-ref` pins vertice-bff `20444752…`, and the local vertice-bff
checkout is at that commit. Neither mentions an anamnese (`grep -ri anamnese` in its `src` and
`docs` finds nothing). `ClientSummary` has `suspended` but no `hasAnamnese`.

**Privacy text.** `src/app/privacidade/page.tsx` (a draft pending legal review):
- §4 (`:98-121`): health-data consent "antes de qualquer registro"; what goes to Anthropic; "Não
  enviamos o cadastro do aluno…".
- §5 (`:124-137`): who sees the data.
- §7 (`:162-180`): retention.

The AI precedent changed only `LEGAL_TEXT_DATE` (`versions.ts`, comment at `page.tsx:10-14`).

## 4. Findings by dimension

### 1. PRD fit and the design gate

**F1 (Blocker): design gate not cleared**
- **What:**
  - No `docs/prds/client-anamnese/prd.md` exists in this repo.
  - The vertice-api PRD itself carries `Design: pending` and points at the pen.dev section.
  - Section `c1tY9` holds 10 frames: `dqvZj`, `tIQlg`, `kTLc2`, `ik5C5`, `QSfhj`, `h49po`,
    `iDTb7`, `iIb3w`, `k1OeP5`, `x9k4ZI`.
  - This run read them (read-only) and drafted nothing. Their copy matches the PRD (R16, R17,
    R25, R26, R39).
- **Where:** source PRD header; `Vertice Web.pen` section `c1tY9`; CLAUDE.md "Design gate".
- **Why it matters:** this repo starts no code while the design is pending. The frames also
  leave out states the build will have (F10).
- **Recommendation:** add the missing states (F10). The owner approves the section and sets
  `Design: design-ok` on the source PRD (or on a web PRD, if one is written). Only then is the
  spec implementable. Q1.

**F3 (Medium): the tab must be addressable by URL (R28)**
- **What:** R28's link opens "the client's Anamnese tab" in a new browser tab. The tab is
  component state (`StudentDetailContent.tsx:26`), so a URL can't select it.
- **Where:** `src/app/(app)/alunos/[studentId]/page.tsx:3-9`, `StudentDetailContent.tsx:23-26`;
  R9, R28, E13.
- **Why it matters:** without it, "Ver anamnese" lands on "Planos de treino" and the trainer
  has to find the tab.
- **Recommendation:**
  - `page.tsx` reads `searchParams.aba` and passes the initial tab.
  - Switching tabs updates the query with `router.replace` (no history entry), so a reload
    keeps the tab.
  - Accepted values are a closed map (`planos`, `feedbacks`, `progresso`, `anamnese`); an
    unknown value falls back to plans.
  - The panel link is `/alunos/${clientId}?aba=anamnese`. Q5.

**F9 (Medium): "Só você vê. <nome> não tem acesso a este texto." is not true under R35**
- **What:** the side card in `dqvZj`/`kTLc2` promises the client never has access. R35/E18 put
  every anamnese in the client's export, which is their LGPD art. 18 right (API-F3).
- **Where:** frames `dqvZj`, `tIQlg`, `kTLc2` (text `LdGwe`); R3, R35.
- **Why it matters:** the copy is a privacy statement to the trainer. A wrong one is the kind of
  promise the pending legal review (R34) would strike, and it sets up a "my client read my
  notes" surprise.
- **Recommendation:** reword it to "in the app" scope, e.g. "Seu aluno não vê este texto no
  aplicativo. Ele faz parte dos dados que o aluno pode pedir à Vertice." Final copy from the
  owner or lawyer. Q3.

**Not every rule needs UI.** R22–R24, R29 and R40 are satisfied by the BFF reading the anamnese
itself. The web's chat request (`WorkoutChatRequest`) stays as it is and must not start carrying
the text: that would make the trainer's unsaved draft reachable (E14) and duplicate R24's
whitelist on the client.

### 2. Upstream readiness (BFF/API dependency)

**F2 (Blocker): every endpoint this feature calls is new**
- **What:** at the pinned BFF commit (`2044475`) there is:
  - no anamnese route;
  - no `hasAnamnese` on `ClientSummary`;
  - no conflict signal in `AssistantStreamEvent`.

  Assumed contract (the BFF assessment is being written in parallel; the spec must re-check it):
  - `GET /api/clients/:clientId/anamnese` → `{ text: string, updatedAt: string | null }`, with
    the empty state as 200 `text: ""`, `updatedAt: null`. Never 404 (API §4.3).
  - `PUT /api/clients/:clientId/anamnese` with `{ text }` → the same shape. A blank text clears.
  - Both are roster-gated: another trainer's or a former client's id gives 403 `FORBIDDEN`. An
    over-limit text gives 400 `VALIDATION_ERROR`.
  - `ClientSummary.hasAnamnese: boolean` on `GET /api/clients`.
  - A conflict line in the stream that the web can tell apart from AI-R51's line (F6).
  - `GET /api/assistant/status` unchanged (`{ enabled }`) for R39.
- **Where:** `src/lib/api/schema.ts` (generated), `.bff-ref`; vertice-api and vertice-ai order
  in API-F17 and API-F21.
- **Why it matters:** CLAUDE.md requires the contract to come from the generated `schema.ts`
  (`npm run api:types`). No wire type may be written by hand, so the web PRs can't merge
  before the BFF's.
- **Recommendation:**
  - The spec can be written now against the assumed shape.
  - Implementation can start against a BFF branch with `npm run api:types -- --local`.
  - Merging waits for the BFF merge commit in `.bff-ref`.
  - Two web slices are possible: the tab and badge first, the panel and conflict line second
    (§7).

### 3. Screens and routing

Nothing beyond F3. Checked:
- The feature stays inside `(app)` routes that `src/proxy.ts` already guards: `/alunos/[studentId]`
  and the editor routes.
- No new route.
- The server/client split holds: `page.tsx` reads `searchParams` and hands it off.
- The roster and the panel are existing client components.
- A new tab is consistent with the PRD's "Placement" decision, and the design shows it in place
  (`dqvZj`).

### 4. Design system and the Pencil sync

**F10 (Medium): states the frames don't show**
- **What:** the 10 frames cover empty, saved, editing, leave dialog, over limit, badge, both
  panel notices and the conflict line. Missing:
  - the tab while loading;
  - the tab when the read fails;
  - "Salvar" while saving;
  - a failed save (network, 403 after the relationship ended, 400);
  - E25: AI-R51's line and the conflict line together;
  - the panel strip while its read is pending, or after it failed;
  - the panel for a former trainer (API-F2: the editor is still reachable, the anamnese isn't).
- **Where:** section `c1tY9`; R12, R14, R25–R28, R31, E25.
- **Why it matters:** each state will be built anyway. Without a frame it is invented in code and
  reviewed after the fact.
- **Recommendation:** add them before approval. Assumptions meanwhile (Q7):
  - loading uses the page's existing `skeleton-shimmer` blocks;
  - a load error shows the message plus "Tentar novamente";
  - saving shows `Button`'s loading state;
  - a save error is an inline danger line above "Salvar" that keeps the text;
  - the panel shows no strip until its read settles, and none on a failure or a 403 (Q2).

**F15 (Medium): `TextArea` has no tall or counted variant**
- **What:** the kit `TextArea` is fixed at `h-[104px] resize-none` with a help or error line
  (`TextArea.tsx:43`). The anamnese box is page-height, with a right-aligned "N / 5.000" counter
  and an over-limit line (frames `dqvZj`, `h49po`). That is closer to the chat composer
  (`AiChatPanel.tsx:292-312`), which isn't a kit component.
- **Where:** `src/components/ui/TextArea/TextArea.tsx`; frames above.
- **Why it matters:** CLAUDE.md says kit components are generated from the Pencil file and synced
  through the `pencil` MCP tools. A one-off `className` override on a fixed-height box drifts
  from the kit.
- **Recommendation:** either give `TextArea` a size or rows option and an optional
  `counter`/`max` slot (kit change, synced from the design, then `pencil-design-audit`), or keep
  the anamnese box as a domain component built from tokens. The spec picks one. The counter
  logic (count, over, remaining) goes into a pure function either way, so it can be shared with
  the composer later.

**F14 (Low): the badge fits the existing pattern**
- **What:** `Badge` already has `warning` (`Badge.tsx:3, 17`), as the frame `iDTb7` uses. A row can
  now carry two badges ("Suspenso" and "Sem anamnese") in the fixed `COLUMN_WIDTHS.student`
  column, where the name truncates (`AlunosContent.tsx:156-158`).
- **Where:** `AlunosContent.tsx:149-165`; R21.
- **Why it matters:** with both badges a long name truncates hard.
- **Recommendation:** order the badges "Suspenso" then "Sem anamnese", both `shrink-0`. Add a
  story row with both. No kit change.

No floating UI is introduced: the leave dialog is the existing `Dialog`/`ConfirmDialog`.
After implementation, run `pencil-design-audit` only if the kit `TextArea` changes (F15).

### 5. Data fetching and cache invalidation

**F5 (High): the draft must never be overwritten by a refetch**
- **What:** the tab loads the saved text with `useQuery`. With the app defaults, that query
  refetches on window focus once 30 s have passed, and E13 sends the trainer between tabs by
  design. If the form is seeded with `useForm({ values })` or `reset(data)` on every data change,
  any refetch replaces what the trainer is typing. The refetch can be triggered by:
  - the trainer coming back from the editor tab;
  - a save in another tab (E6);
  - an invalidation.
- **Where:** new `AnamneseTab.tsx`; `src/app/providers.tsx`; R12, R15, R20, E6, E13.
- **Why it matters:** silent loss of unsaved health notes, which is exactly what R15 exists to
  prevent. The leave guard would also stop firing, since the draft would equal the "saved" text
  again.
- **Recommendation:** use the editor's pattern ("the session only reads `initial` at mount",
  `WorkoutEditor.tsx:113-121`):
  - Hold `draft` and `baseline` in local state, seeded once from the first successful read.
  - Rebase `baseline` (and `updatedAt`) only from this tab's own successful `PUT` response.
  - While the draft is clean, adopting a newer server text is safe and shows the latest (E6's
    last-wins outcome). While it is dirty, ignore refetches.
  - The rule ("dirty = draft !== baseline; refetch adopted only when clean") goes into a small
    pure module with unit tests.
  - No autosave engine: R12 is an explicit save, so `src/lib/workoutEditor/` is the wrong size
    for this.

**F11 (Medium): keys and invalidation**
- **What:** new key `["student", clientId, "anamnese"]`, under the existing `["student", id, …]`
  family. A successful save must:
  - set this key's data from the response;
  - invalidate `["students"]`, so the badge updates (E5).
- **Where:** new `src/lib/api/anamnese.ts` (or additions to `students.ts`); `AlunosContent.tsx:38`.
- **Why it matters:** without the roster invalidation, E5's badge comes back only after 30 s or
  a reload.
- **Recommendation:** as above, invalidate-on-success like every other mutation. No hand-patching
  of `ClientSummary`.

**F8 (Medium): the panel strip goes stale across browser tabs**
- **What:** E5 and E13: the trainer fills or clears the anamnese in the new tab and comes back to
  the editor. R29 makes the next message use the new text, but the strip at the top of the panel
  still says what it read before. With a 30 s `staleTime`, a return inside 30 s doesn't refetch
  on focus.
- **Where:** `WorkoutEditor.tsx` (new query beside `:86-90`), `AiChatPanel.tsx` (new prop); R25,
  R26, R29, E5, E13.
- **Why it matters:** the strip is the trainer's only signal of what the assistant uses. Saying
  "ainda não tem anamnese" right after they filled it in undermines R25/R26's purpose.
- **Recommendation:**
  - The editor reads the anamnese status with `staleTime: 0` and `refetchOnWindowFocus: true`,
    enabled only while the assistant is enabled for the trainer. Without the assistant, no
    health text is fetched into the editor.
  - It also refetches when the panel opens.
  - The panel gets a three-state prop (`present` / `absent` / `unknown`), with `unknown` for
    pending, failed or 403 (F10, Q2).
  - If the BFF offers a boolean (e.g. on `ClientDetail`), prefer it over pulling the full text
    into the editor's cache. Q8.

### 6. API client and validation

**F12 (Low): one bound, one blank rule, mirrored**
- **What:** three things need a single source:
  - R10's 5,000 is counted in UTF-16 units on all three layers (API-F5);
  - "blank" (R19) must match the API's definition (API-F6: Unicode whitespace including U+00A0
    and line breaks; JS `trim()` already strips those);
  - E2 needs a paste of 6,000 characters to stay in the box so the counter can show the excess.
- **Where:** `src/lib/validation/bounds.ts` (new `ANAMNESE_MAX = 5000`), new
  `src/lib/validation/anamnese.ts` (`isBlankAnamnese`, counter helpers), and
  `src/lib/api/types.ts` aliases over the generated schema.
- **Why it matters:**
  - A `maxLength` attribute would silently cut the paste (breaking E2).
  - Zod's `.max()` counts code points, against `bounds.ts`'s own warning.
  - A different blank rule would show "Atualizada em" for a text the server cleared.
- **Recommendation:**
  - No `maxLength` on the textarea.
  - Use `maxUnits`/`.length` for the counter and the gate.
  - Send the text untrimmed (E4).
  - Unit-test the blank rule with U+00A0, `\n`, `\t` and an emoji at the boundary
    (4,999 + one surrogate pair).

No react-hook-form is needed for a single field. A plain controlled `textarea` keeps the
F5 rule explicit (CLAUDE.md's `useWatch` note applies only if RHF is used).

### 7. Error handling and session edges

**F13 (Medium): save and load failures must keep the text**
- **What:**
  - A 403 on the **read** is a non-roster client. The page's overview query already bounces
    (`StudentDetailContent.tsx:36`).
  - A 403 on the **save** means the relationship ended mid-edit (R7). Running
    `useRedirectOnError` on the mutation would navigate away and drop the draft.
  - A 400 `VALIDATION_ERROR` is the server's length backstop.
  - A network or 5xx failure must keep the draft and allow a retry.
  - A 401 makes `apiClient` hard-navigate to `/login` (`client.ts:89`). With unsaved text,
    `beforeunload` fires on that navigation, so the trainer gets the browser prompt instead of
    a silent loss. That is acceptable.
- **Where:** new `AnamneseTab.tsx`; `src/lib/hooks/useRedirectOnError.ts`;
  `src/lib/api/errorMessages.ts`; R7, R12.
- **Why it matters:** losing an anamnese on a failed save is the same harm as F5.
- **Recommendation:**
  - Mutation errors are inline, never a redirect, with copy from `apiErrorMessage(error.code)`.
  - A save 403 shows a message ("Você não acompanha mais este aluno…") and keeps the text
    selectable, so it can be copied.
  - The panel's read treats 403 as `unknown` (no strip), not as an error (API-F2, Q2).

**R39 (Low, folded here):** the tab reuses `assistantStatusQueryKey`. Until it answers, and on
failure, the AI sentence is hidden. That matches the BFF, which answers `{enabled:false}` when it
can't evaluate the flag. The sentence can appear a moment late, which is better than promising
AI use that isn't on.

### 8. State complexity

**F4 (High): R15's leave warning has no reusable mechanism**
- **What:** the PRD's R15 has three exits, each needing a different mechanism:
  1. **Switching tab** inside the page (E3): plain state. Intercept `setTab` and open the dialog.
  2. **In-app navigation**:
     - the "Alunos" back link, the header nav (`AppHeader.tsx:28-30`) and any other `Link`;
     - programmatic `router.push` from "Encerrar acompanhamento" and "Sair" (`useSignOut`);
     - browser back/forward.

     The App Router can't veto any of them. Links can be caught with the editor's capture-phase
     click interceptor. `router.push` callers can't, unless they consult the guard. Back/forward
     (`popstate`) can't be stopped without history hacks.
  3. **Reload or close** (E24): `beforeunload`, browser prompt (R15 asks for exactly that).

  The editor's precedent uses `window.confirm` for links (`WorkoutEditor.tsx:316-340`). The
  design asks for the styled dialog `QSfhj` ("Sair sem salvar a anamnese?", "Continuar editando"
  / "Sair sem salvar").
- **Where:** new `src/lib/hooks/useLeaveGuard.ts`; `StudentDetailContent.tsx`;
  `src/lib/auth/useSignOut.ts`; R15, E3, E24.
- **Why it matters:** a guard that only covers tab clicks passes the E3 story and still loses the
  text on the far more common "click Alunos in the header".
- **Recommendation:** one hook, `useLeaveGuard({ when, onConfirmLeave })`, owned by
  `StudentDetailContent` (the tab lifts `dirty` up). It:
  - registers `beforeunload` while dirty;
  - intercepts same-origin, unmodified, non-`_blank` link clicks in the capture phase, calls
    `preventDefault`, opens the `ConfirmDialog`, and on "Sair sem salvar" `router.push`es the
    stored `href`;
  - exposes `confirmLeave(action)` for the tab switch and for "Encerrar acompanhamento".

  The "Sair" button in `ProfileMenu` and back/forward are accepted gaps, documented in the spec
  (Q4). The editor's own guard stays as it is (out of scope); the hook may later replace it.

**F6 (High): the conflict line needs its own signal and its own kind in the chat store**
- **What:**
  - R30 needs one extra line. R31 needs it separate from AI-R51's line when both apply (E25),
    and it may also follow AI-R30's text answer.
  - In `chat.ts`, after a `proposal` the store resets `textId` once (`:288`). Every following
    `text` delta goes into that one bubble (`:237-246`), so two lines arrive as one paragraph.
  - Frame `x9k4ZI` gives the conflict line a warning-triangle icon. AI-R51's line is plain text,
    so the web has to know which line is which.
  - The API assessment (API-F19) proposes a second `text` event in a fixed order. Plain `text`
    gives the web no way to tell the two lines apart, and no way to keep them separate without
    relying on ordering alone.
- **Where:** `src/lib/assistant/contract.ts:35-40, 105-143`; `src/lib/assistant/chat.ts:237-246,
  286-290`; `AiChatPanel.tsx:26-101` (`Bubble`); R30, R31, E15, E25.
- **Why it matters:**
  - Without a marker, R31 fails (one merged bubble) and the design's icon can't be drawn.
  - Rolling out a new event name: an old web drops it silently (`contract.ts:140-142`), so R30 is
    lost until the web ships. A marked `text` event rendered by an old web merges into the
    R51 bubble instead.
- **Recommendation:** ask the BFF for a typed line, either a new event (`event: "conflict"`,
  `{ text }`) or a `text` event with `kind: "conflict"`, emitted whole (not streamed in deltas).
  The web then:
  - parses it into `{ type: "conflict", text }`;
  - pushes a new `ChatMessage` kind `conflict` that always starts its own bubble;
  - renders it with the warning icon;
  - also starts a new bubble for every complete R51 line, so E25 shows two lines.

  `chat.test.ts` covers proposal + R51 + conflict, text answer + conflict, and conflict alone.
  The web should merge soon after the BFF, because the window between them shows the line wrong
  or not at all. Q6 covers the icon in the text-only case.

### 9. Copy and localization

Nothing beyond F9. Checked:
- All copy in the design is pt-BR (`anamnese-design-copy` list).
- "Anamnese", "aluno" and "Assistente IA" match existing usage ("Assistente IA" in
  `AiChatPanel.tsx:191`).
- No new label map is needed: the suggested topics are static copy, not an enum.

The panel strip and notice copy belong next to the assistant's in `src/lib/assistant/copy.ts`.
The tab's copy stays in the tab, or goes in `src/lib/anamnese/copy.ts` if the panel and the tab
share the explanation.

### 10. Testing

See §6. The baseline holds:
- `unit` (node) covers `src/lib/**/*.test.ts`;
- `storybook` runs every story in Chromium;
- pages have no tests, but `AlunosContent.stories.tsx` shows that `*Content` components are
  testable with `withSeededQueries`.

### 11. Performance and loading UX

Nothing found. Checked:
- The student page already uses `skeleton-shimmer` blocks while the overview loads
  (`StudentDetailContent.tsx:44-55`). The tab's loading state should use the same blocks at the
  text box's size, to avoid a jump.
- The badge adds no request: it rides on `ClientSummary`.
- React Compiler is on: no manual memoization.
- The editor's extra read is one small request, only while the assistant is enabled (F8).

### 12. Effort, risk, and dependencies

See §7.

**F7 (High): the privacy text gates the launch (R33)**
- **What:** there is no feature switch (PRD §6), so the first BFF deploy sends the anamnese to
  Anthropic and the first web deploy shows the tab (API-F17). `/privacidade` must change before
  either. The current draft is contradicted in four places:
  - §4 says health-data consent comes "antes de qualquer registro" (`page.tsx:100-104`). R41/R42
    record the anamnese before consent, on the trainer's basis.
  - §4's list of what goes to Anthropic (`:107-114`) doesn't include the anamnese.
  - §4's "Não enviamos o cadastro do aluno…" (`:115-121`) needs the anamnese added as something
    that *is* sent, plus advice like the plan-text sentence's.
  - §7 retention (`:162-180`): the anamnese is kept, hidden, after a relationship ends, until
    either account is deleted (API Q2).

  §5 ("Os dados de um aluno são vistos pelo próprio aluno e pelo treinador dele", `:126`) is
  now nuanced: the client doesn't see it in the app (R3), and admins never see it (R4).
- **Where:** `src/app/privacidade/page.tsx`; `src/lib/legal/versions.ts` (`LEGAL_TEXT_DATE`);
  R32–R34, R41, R42.
- **Why it matters:** R33 is the PRD's only launch condition. The text is also what the pending
  legal review reads.
- **Recommendation:**
  - A separate small web PR, merged right after the API PR and before vertice-ai/BFF.
  - Change `LEGAL_TEXT_DATE` only, no version bump, following the AI precedent
    (`page.tsx:10-14`). The lawyer may reverse that.
  - Check `/termos` for a trainer-responsibility clause that should mention the anamnese.

## 5. Options

The one real choice is how the leave warning reaches in-app links (F4).

| Option | Description | Covers | Cost |
|---|---|---|---|
| A | `window.confirm` in a capture-phase click handler, as in the editor | Links, with the browser's own box (not frame `QSfhj`) | Smallest; deviates from the design |
| B | Capture-phase interception that `preventDefault`s, opens the designed dialog, then `router.push(href)` on confirm; a `confirmLeave(action)` for tab switch and buttons | Links, tab switch, explicit buttons; matches `QSfhj` | Small hook plus tests |
| C | B plus a `popstate` trap (push a sentinel history entry while dirty) | Also back/forward | History manipulation that fights the App Router; fragile, and it changes the back button for every visitor |

Recommendation: **B**, with back/forward and "Sair" accepted as gaps (Q4). The design rules out
A, and C's cost isn't worth it for a single text field.

## 6. Testing strategy

**`unit` project (node):**
- `src/lib/validation/anamnese.test.ts`:
  - the blank rule (spaces, U+00A0, line breaks);
  - the counter in UTF-16 (5,000 ok; 5,001 over; a surrogate pair at the boundary);
  - "remaining to delete" for the over-limit line.
- The draft/baseline rule (F5): dirty detection; a refetch adopted when clean, ignored when
  dirty; rebase on own save; blank save returns the E1 state.
- `src/lib/assistant/chat.test.ts` (existing file): conflict after proposal alone,
  R51 + conflict (two bubbles, fixed order), conflict after a text answer, and an unknown kind
  still ignored.
- `contract.test.ts`: the new schema alias and bound match the generated contract.
- `useLeaveGuard`: if its click-filter logic (same origin, modifiers, `_blank`, same pathname)
  is a pure predicate, unit-test the predicate.

**`storybook` project:**
- `[studentId]/AnamneseTab.stories.tsx`, seeded with `withSeededQueries`, one story per frame
  state: E1 empty (AI on, AI off for R39/E21), saved with "Atualizada em", dirty with
  "Alterações não salvas", over limit with "Salvar" disabled, loading, load error, save error
  keeping the text. A `play` test pastes 6,000 characters and checks nothing is cut (E2).
- A `StudentDetailContent` story for E3: a dirty tab plus a click on "Planos de treino" opens
  the dialog; "Continuar editando" keeps the text; "Sair sem salvar" switches.
- `?aba=anamnese` opens the tab (F3).
- `AlunosContent.stories.tsx`: a row with "Sem anamnese", and a row with "Suspenso" and
  "Sem anamnese".
- `AiChatPanel.stories.tsx`: strip present, absent (link `target="_blank"` to
  `?aba=anamnese`), unknown (no strip), and the conflict line with the icon, including E25.

**Not covered by automation:** `beforeunload` (E24) and the real cross-tab flow (E13). Check
them by hand on a running stack before merge. Pages stay without tests. Story coverage of
`AnamneseTab`, `AiChatPanel` and the two `*Content` stories is enough for this risk.

**`pencil-design-audit`:** only if the kit `TextArea` changes (F15).

## 7. Effort and risk

**Size: M.**
- One new tab component with a small pure state module.
- One shared leave-guard hook.
- A URL-driven tab.
- A badge.
- A panel strip with its own query.
- A new chat message kind.
- The privacy text.

No engine like the workout editor's is needed. F4 and F6 are where the time goes.

**Dependencies, in merge order (from API-F17, adjusted for the web):**
1. vertice-api (RPCs, roster flag, inventory).
2. **This repo: the privacy text PR (F7)**, before anything exposes the feature.
3. vertice-ai (optional field, conflict slot), then vertice-bff (routes, `hasAnamnese`, chat
   read, conflict signal).
4. This repo: the tab, the badge and the panel, after `.bff-ref` points at the BFF merge.
5. The owner's design approval (F1) gates step 4's start, not step 2.

**Smaller first slice:** the tab and badge (R9–R21, R39) can ship once the BFF routes are live,
with the panel strip and conflict line (R25–R31) in a second web PR after vertice-ai's conflict
slot. Both slices are in the existing frames except the states in F10.

## 8. Questions and assumptions

None of these could be put to the owner during this run. Each has the assumption the spec
should use.

- **Q1.** Does the owner approve section `c1tY9` (after F10's states are added), and where does
  `design-ok` get recorded, given there is no web PRD?
  - **Assumption:** on the vertice-api PRD's `Design:` line. Implementation waits for it.
- **Q2.** A former trainer opens the assistant on a former client's workout (API Q1). What does
  the panel show?
  - **Assumption:** no strip at all. The read answers 403 → `unknown`. R26's "Preencher" link
    would lead to a page they can't open.
- **Q3.** Can the side card's "Só você vê. <nome> não tem acesso a este texto." be reworded to
  stay true under R35?
  - **Assumption:** yes, scoped to the app, with a mention of the client's data request (F9).
    Final words from the owner or lawyer.
- **Q4.** Are browser back/forward and "Sair" from the profile menu acceptable gaps in R15?
  - **Assumption:** yes. Links, tab switches, "Encerrar acompanhamento", reload and close are
    covered (Option B).
- **Q5.** What is the URL for the tab?
  - **Assumption:** `/alunos/:id?aba=anamnese`. The other tabs get `planos`, `feedbacks` and
    `progresso`, and switching uses `router.replace`.
- **Q6.** When the conflict line follows a text answer (no proposal), does it get the same
  warning-icon line as in `x9k4ZI`?
  - **Assumption:** yes, whenever the stream marks it as the conflict line. If vertice-ai can
    only fold it into the model's text in text mode, it renders as plain text there.
- **Q7.** How do loading, load error, saving and save error look (F10)?
  - **Assumption:**
    - loading: skeleton blocks;
    - load error: message plus "Tentar novamente";
    - saving: loading "Salvar";
    - save error: an inline danger line above "Salvar" that keeps the text (403: "Você não
      acompanha mais este aluno.").
- **Q8.** Where does the editor get "has an anamnese" for the strip?
  - **Assumption:** from `GET /api/clients/:clientId/anamnese` (non-empty `updatedAt`), fetched
    only while the assistant is enabled. A BFF boolean on `ClientDetail` would be preferable if
    the BFF assessment offers one.
- **Q9.** Does "Encerrar acompanhamento" with unsaved anamnese changes ask first?
  - **Assumption:** yes, through `confirmLeave` before its dialog opens. Ending the relationship
    makes the anamnese unreachable anyway (R7).
- **Q10.** Does the BFF contract match §4.2's assumptions (paths, empty state as 200, 403 for
  non-roster ids, `hasAnamnese`, a typed conflict line)?
  - **Assumption:** yes. The spec re-checks against the BFF assessment once it is written.

## 9. Inputs to the spec

- [ ] F1: design approval of section `c1tY9` and where `design-ok` is recorded; implementation
      waits for it.
- [ ] F2: the BFF contract (paths, shapes, empty state, error codes, `hasAnamnese`, conflict
      signal) and the `.bff-ref` merge gate.
- [ ] F4: the leave-guard mechanism (Option B), what it covers, and the accepted gaps.
- [ ] F5: the draft/baseline rule: seed once, rebase only on own save, adopt refetches only
      when clean.
- [ ] F6: the conflict line's wire shape, the chat-store kind, one bubble per line, and the
      web/BFF merge timing.
- [ ] F7: the privacy-text changes (§4, §5, §7, `LEGAL_TEXT_DATE`) as a separate PR merged
      before the BFF.
- [ ] F3: `?aba=` values, `router.replace` on switch, and the panel link target.
- [ ] F8: the panel strip's query (key, `staleTime: 0`, focus refetch, enabled only with the
      assistant on) and its three states.
- [ ] F9: the replacement for "Só você vê…".
- [ ] F10: the missing states, added to the design or decided in the spec.
- [ ] F11: the query key and the invalidations on save.
- [ ] F13: inline save errors, never a redirect on the mutation; 403 copy.
- [ ] F15: kit `TextArea` variant vs. a domain text box with a counter.

**Design frames (existing, not drafted by this assessment; awaiting owner approval):**
section `c1tY9` "Web — Anamnese do aluno (client-anamnese)":
- `dqvZj` 1. Anamnese — aluno novo, sem texto
- `tIQlg` 1b. Anamnese — assistente de IA desligado
- `kTLc2` 2. Anamnese preenchida e salva
- `ik5C5` 3. Editando, com alterações não salvas
- `QSfhj` 3b. Aviso ao sair com alterações não salvas
- `h49po` 4. Acima de 5.000 caracteres — Salvar bloqueado
- `iDTb7` 5. Alunos — selo "Sem anamnese"
- `iIb3w` 6. Painel com anamnese — linha fixa no topo
- `k1OeP5` 7. Painel sem anamnese — aviso com link
- `x9k4ZI` 8. Proposta + linha de conflito com a anamnese
