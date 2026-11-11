# Technical assessment (Web): Client First Access by Email

Status: Draft
Owner: hebertpdl@gmail.com
Related: source PRD, `vertice-api`'s
[`docs/prds/client-first-access-email/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/client-first-access-email/prd.md)
(no web PRD for this slug); upstream assessments
[`vertice-api`](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/client-first-access-email/assessment.md)
("API F*n*") and
[`vertice-bff`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/client-first-access-email/assessment.md)
("BFF F*n*"); BFF contract
[`docs/api-contract.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
Spec: not yet written (will be `docs/specs/client-first-access-email/spec.md`)

## 1. Summary

Overall risk: **Medium.**

**Design gate.** No web PRD exists for this slug, so there's no `Design:` line. The `vertice-api` PRD
describes trainer-visible states:
- "Aguardando primeiro acesso" with the last send time;
- "Falha no envio do e-mail";
- a resend action;
- an email field that becomes read-only;
- the expired-link copy.

It doesn't state whether a screen/design update is needed, and nothing in the pen.dev file has
been changed for it. Whether this needs a web PRD with a `Design:` line, or just updated frames
for owner approval, is the owner's call (Q1). Implementation shouldn't start until it's settled
(CLAUDE.md, "Design gate").

**The work.** The UI is mostly removal plus a small status component:
- `StudentAccessLink` (the copyable link) and its two entry points go away.
- The new-student dialog's success step reports whether the email went out.
- The student page shows first-access status with a "Reenviar e-mail" action.
- `EditStudentDialog` locks the email once the client is active.
- The first-access page's copy changes.

Everything depends on BFF fields and a route that don't exist yet.

| Id | Severity | One line |
|---|---|---|
| F1 | High | Depends on BFF changes that don't exist yet: `firstAccess` on create/overview/PATCH, the resend route, removal of `setup` and `POST /clients/:id/setup-token` |
| F2 | High | `StudentAccessLink`, the "Link de acesso" button and the dialog's link step must go entirely; any remnant shows the trainer a token (R2) |
| F3 | High | The design gate isn't defined for this feature: no web PRD, no `Design:` line, no frames for the new states (Q1) |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1 | change: `NewStudentDialog` success step (`src/components/domain/NewStudentDialog/NewStudentDialog.tsx:69-90`) | "E-mail de primeiro acesso enviado para …" |
| R2 | change: remove `StudentAccessLink` (`src/components/domain/StudentAccessLink/`), its use at `NewStudentDialog.tsx:78-82` and `StudentDetailContent.tsx` ("Link de acesso" button and dialog, `:94-122`), `issueStudentSetupToken`/`setupLink` (`src/lib/api/students.ts:57-64`) | F2 |
| R3 | not applicable to the web | Retries are vertice-api's |
| R4 | change: `NewStudentDialog` success step | Created, but the email failed: say so, offer resend (F5) |
| R5 | new: resend action; change: `EditStudentDialog` | Same failure state |
| R6 | not applicable to the web | |
| R7 | not applicable to the web | |
| R8 | existing: `src/app/(auth)/definir-senha/SetPasswordForm.tsx:115` | |
| R9 | existing: `/definir-senha` | No change |
| R10 | change: `SetPasswordForm.tsx:20-21` copy | F7 |
| R11 | new: first-access status on the student page | Data from the overview (F4) |
| R12 | new: same component | |
| R13 | new: same component | Hidden when `firstAccess` is `null` |
| R14 | new: "Reenviar e-mail" in the status component | `src/lib/api/students.ts` gets the new wrapper |
| R15 | new: hidden when `null`; 409 handled anyway | |
| R16 | new: resend error → `rateLimitedMessage` (`src/lib/api/rateLimit.ts`) | BFF 429 + `Retry-After` (BFF F3) |
| R17 | new: same | |
| R18 | not applicable to the web | |
| R19 | not applicable to the web | |
| R20 | new: resend + `EditStudentDialog` error | |
| R21 | existing: `EditStudentDialog` (`src/components/domain/EditStudentDialog/EditStudentDialog.tsx:107-110`) | |
| R22 | change: `EditStudentDialog` | After saving a new email, show the send outcome (F5) |
| R23 | change: `EditStudentDialog` | Email read-only once active; handle the BFF refusal anyway (F6) |
| R24 | not applicable to the web | Clients change their own email in the app (the web is trainer-only) |
| R25 | not applicable to the web | |
| R26 | existing: `useRedirectOnError` on the student page | An ended client 403s → redirect, as today |
| R27 | not applicable to the web | Ops script |
| R28 | not applicable to the web | |
| R29 | not applicable to the web | |
| R30 | not applicable to the web | The email template is vertice-api's |
| E1 | change: `NewStudentDialog` + status component | |
| E2 | not applicable to the web | |
| E3 | new: status component | Comes from the overview query |
| E4 | new: status component | Invalidate the overview after resend |
| E5 | new: resend | |
| E6 | new: resend error | |
| E7 | new: resend error | |
| E8 | not applicable to the web | |
| E9 | change: `EditStudentDialog` | |
| E10 | change: `EditStudentDialog` | Depends on API Q2 |
| E11 | change: `EditStudentDialog` | |
| E12 | new: resend 409 | |
| E13 | change: `SetPasswordForm.tsx:20` copy | |
| E14 | same | |
| E15 | same | |
| E16 | not applicable to the web | |
| E17 | existing: `useRedirectOnError` | |
| E18 | not applicable to the web | |
| E19 | not applicable to the web | |

## 3. Current state

- **`NewStudentDialog`**:
  - after `createStudent` it switches to a "Aluno criado" step;
  - that step shows "Envie este link para {name} definir a senha de acesso." (or "…o link de acesso
    não foi gerado." when `setup` is `null`) and renders `StudentAccessLink` with the token
    (`NewStudentDialog.tsx:69-90`);
  - it invalidates `["students"]` and `["dashboard"]` (`:55-56`).
- **`StudentAccessLink`** (120 lines, with stories) shows the link with a copy button and its expiry,
  or "Gerar link de acesso" to re-issue through `POST /clients/:id/setup-token`
  (`StudentAccessLink.tsx:9-35`).
- **The student page** (`src/app/(app)/alunos/[studentId]/StudentDetailContent.tsx`) loads
  `["student", id, "overview"]` from `GET /clients/:id/overview` (`:32-35`; `students.ts:38-40`). It
  has a "Link de acesso" button that opens a dialog with `StudentAccessLink setup={null}` (`:94-122`).
- **`EditStudentDialog`** edits name, email and CPF, maps 409 `CONFLICT` onto the email field, and
  invalidates the student, roster, dashboard and recent-workouts queries
  (`EditStudentDialog.tsx:61-72`).
- **The first-access page** (`SetPasswordForm.tsx`):
  - `INVALID_LINK_MESSAGE = "Link inválido ou expirado — peça um novo ao seu treinador."` (`:20`);
  - `MISSING_TOKEN_MESSAGE = "Link incompleto — abra o link completo enviado pelo seu treinador."` (`:21`).
- **Rate limits**: `ApiError.retryAfter` (`src/lib/api/client.ts:21-24`) and `rateLimitedMessage`
  (`src/lib/api/rateLimit.ts`, tested) already turn a 429 into "wait N" copy.
- **Contract**: `src/lib/api/schema.ts` is generated from the BFF's pinned OpenAPI
  (`src/lib/api/.bff-ref`). `PasswordSetup` (`types.ts:47-48`) aliases `PasswordSetupToken`, which
  disappears from the clients surface.

## 4. Findings by dimension

### PRD fit and the design gate

**F3 — High — The design gate has no anchor.**
- **What**: CLAUDE.md's gate is a `Design:` line in a *web* PRD. This feature's only PRD is
  vertice-api's, which has no such line and doesn't say whether screens change, although its rules
  describe new states.
- **Where**: `vertice-api/docs/prds/client-first-access-email/prd.md` (header); CLAUDE.md "Design
  gate".
- **Why it matters**: without the gate, the status component, the dialog's new success copy and the
  locked email field get built with no approved design. The gate exists to prevent that.
- **Recommendation**: the owner decides (Q1). Either write a short web PRD with `Design: pending`
  and the pen.dev frames for the states below, or confirm that frames plus approval in the pen.dev
  file are enough. The states the frames need:
  - "Aluno criado" with email sent / not sent;
  - first-access status pending / failed;
  - resend loading / rate-limited / failed;
  - the email field locked;
  - the first-access page copy.

### Upstream readiness (BFF/API dependency)

**F1 — High — Blocked on the BFF and API.**
- **What**: the web needs the following, and none of it exists yet:
  - `firstAccess` on `POST /clients`, `GET /clients/:id/overview` and `PATCH /clients/:id`;
  - a resend route;
  - a distinct code for "can't change an active client's email";
  - `setup` and the setup-token route removed.
- **Where**: BFF F1, F4, F5, F9; `src/lib/api/schema.ts` (generated); rules R1, R4, R11–R14, R22,
  R23.
- **Why it matters**: the web spec can't name fields until the BFF spec does. The order is api → bff
  → web, then the API flag goes on (API F6).
- **Recommendation**: write the web spec after the BFF spec. Take the contract with `.bff-ref` plus
  `npm run api:types`, and let typecheck find every `setup` reader.

### Screens and routing

No new route. Everything lives on the student page and in the two existing dialogs. The status
belongs in the page header next to the actions where "Link de acesso" sits now
(`StudentDetailContent.tsx:89-100`), which keeps the same place in the trainer's mental model.

### Design system and the Pencil sync

**F8 — Low — No kit change is needed.**
- **What**: the status component (a line with a badge plus a resend button) can be built from
  `Badge` and `Button`. The locked email can use `TextField` disabled or read-only.
- **Where**: `src/components/ui/` (Badge, Button, TextField); new
  `src/components/domain/FirstAccessStatus/`.
- **Why it matters**: it's a domain component, not a kit change, so no Pencil regeneration of
  `ui/`.
- **Recommendation**: add a domain component with stories. Its frames come from F3.

### Data fetching and cache invalidation

**F4 — Medium — Where the status comes from and what refreshes it.**
- **What**: the student page reads only the overview (`StudentDetailContent.tsx:32-35`), so
  `firstAccess` must be on `GET /clients/:id/overview` (BFF F9). Resend and the email fix change it.
- **Where**: `["student", id, "overview"]`; `EditStudentDialog.tsx:61-66` (already invalidates
  `["student", id]`, a prefix of the overview key).
- **Why it matters**: if resend doesn't invalidate the overview, the page keeps "Falha" after a
  successful resend, or shows an old send time (E4).
- **Recommendation**: resend invalidates `["student", id]`, following the invalidate-by-key rule
  (CLAUDE.md). The edit already covers the email fix. Creating a student needs no change beyond
  today's invalidations.

### API client and validation

**F2 — High — Remove every token path.**
- **What**: to remove:
  - `issueStudentSetupToken` and `setupLink` (`src/lib/api/students.ts:53-64`);
  - the `PasswordSetup` alias (`types.ts:47-48`);
  - `StudentAccessLink` and its stories;
  - its use in `NewStudentDialog` (`:15,19,24,78-82`) and in `StudentDetailContent`
    (`:12`, button `:94-96`, dialog `:113-122`).
- **Where**: as listed. Rule R2.
- **Why it matters**: a surviving "Gerar link de acesso" against a removed route is a 404 at best.
  During the BFF's `setup: null` release (BFF F8), it renders a "link não foi gerado" state that
  invites the trainer to make one.
- **Recommendation**:
  - Delete them in this feature.
  - Add `sendFirstAccessEmail(id)` (name per the BFF spec) in `src/lib/api/students.ts`.
  - Leave `src/lib/validation/students.ts` alone (no new fields).

### Error handling and session edges

**F5 — Medium — The send outcome is a success with a flag.**
- **What**: create, resend and the email fix can all succeed while the email failed (BFF F5
  recommends `200` with `SEND_FAILED`).
- **Where**: `NewStudentDialog.tsx:52-67`, `EditStudentDialog.tsx:61-72`, the new resend mutation.
  Rules R4, R5, R12.
- **Why it matters**: treating it as an error loses the created client from the trainer's flow.
  Treating it as plain success hides the failure.
- **Recommendation**: read `firstAccess.status` in each `onSuccess`, and show the failure inline
  with the resend action. Map 429 through `rateLimitedMessage`. `UPSTREAM_UNAVAILABLE` keeps its
  existing copy.

**F6 — Medium — Email locked for an active client.**
- **What**: the dialog must make the email read-only when `firstAccess` is `null` (R23), and still
  handle the BFF's refusal if the state changed underneath (the client set a password while the
  dialog was open).
- **Where**: `EditStudentDialog.tsx:107-110`; the refusal's code from BFF F5.
- **Why it matters**: today the form would submit, get a 403/409, and show a generic error on a field
  the trainer can't fix.
- **Recommendation**: pass `firstAccess` into the dialog. When it's `null`, disable the field with a
  hint ("O aluno já acessou o app; só ele pode alterar o e-mail."). On the refusal code, set that
  message on the field and refetch the overview.

### State complexity

Nothing beyond what exists today. These are plain mutations with the existing patterns (the
dialog's `created` step state, `useMutation`). No autosave-style engine is needed. Checked:
`NewStudentDialog.tsx:52-90`, `EditStudentDialog.tsx`.

### Copy and localization

**F7 — Medium — Copy that names the trainer as the sender.**
- **What**: `SetPasswordForm.tsx:20` says "peça um novo ao seu treinador". R10 wants "ask your trainer
  to resend the email". `:21` says the link was "enviado pelo seu treinador", which is now false:
  Vertice sends it. The dialog's "Envie este link para…" (`NewStudentDialog.tsx:75-76`) goes away.
- **Where**: as listed. Rules R10, R1.
- **Why it matters**: a client told to "open the link your trainer sent" goes looking in the wrong
  place.
- **Recommendation**: the spec fixes the strings. Proposal:
  - "Link inválido ou expirado — peça ao seu treinador para reenviar o e-mail de acesso."
  - "Link incompleto — abra o link completo do e-mail que você recebeu."
  - Status labels exactly as the PRD names them: "Aguardando primeiro acesso" and "Falha no envio do
    e-mail".

### Testing

**F9 — Medium — Stories to replace.**
- **What**: `NewStudentDialog.stories.tsx` and `StudentAccessLink.stories.tsx` cover the link flow.
  The student page has no tests (pages under `src/app/` never do).
- **Where**: as listed.
- **Why it matters**: stories run as tests (`npm run test:storybook`), so the old ones fail once the
  fields are gone, which is useful as a guard.
- **Recommendation**: see §6.

### Performance and loading UX

Nothing found. Resend is one request with a `loading` button. The status arrives with the overview
the page already loads; no new query, no skeleton. Checked: `StudentDetailContent.tsx:32-60`.

## 6. Testing strategy

- **`FirstAccessStatus` stories** (new): pending with a send time; failed; resend loading; resend
  rate-limited (429 with `retryAfter`); resend failed; hidden when `null`. Send times are formatted
  with `formatDateTime`, in the business zone (CLAUDE.md "Dates and times"; `test:hostile-tz`).
- **`NewStudentDialog` stories**: created with the email sent; created with the email failed (the
  resend action shows); no link anywhere.
- **`EditStudentDialog` stories**: email editable while pending; locked when active; the refusal
  code sets the field message.
- **`SetPasswordForm`**: no test today. The copy change is low risk, so a Storybook story for the
  invalid/missing states is optional.
- **Unit**: nothing new under `src/lib` beyond the API wrapper. Delete `setupLink` and its tests if
  any.
- **Guard**: after `api:types`, `npm run typecheck` must report zero references to `setup` or
  `PasswordSetup` on the clients surface.

## 7. Effort and risk

**Size: S–M.** Removals across three components, one small domain component, two dialog changes,
copy, and stories.

Dependencies:
- the BFF release (F1), which waits on the API release;
- the design gate (F3, Q1);
- the API flag going on after this web deploy (API F6).

Risk is low in code and sits in ordering.

## 8. Questions and assumptions

- **Q1**: Design gate. Does this feature get a web PRD with a `Design:` line, or are pen.dev frames
  plus your approval enough? *Assume a short web PRD isn't needed. The frames listed in F3 are
  added to `Vertice Web.pen`, and you approve them before implementation.* No frames were created
  in this run: the PRD doesn't say screens change (skill rule: don't infer it).
- **Q2**: Is the status also shown on the roster (`/alunos`)? The PRD only says the client's page.
  *Assume no.*
- Inherited: API Q2 (the E10 behavior) and BFF Q2 (resend failure shape) decide F5/F6's details.

## 9. Inputs to the spec

- [ ] F1: Field and route names from the BFF spec; `.bff-ref` bump and `api:types`.
- [ ] F2: Remove `StudentAccessLink`, `issueStudentSetupToken`, `setupLink` and `PasswordSetup`, and both entry points.
- [ ] F3: Design gate path (Q1) and the frames to approve.
- [ ] F4: The `firstAccess` source (overview) and resend's invalidation.
- [ ] F5: Success-with-failure handling on create, resend and email fix; 429 copy.
- [ ] F6: Email lock and refusal handling in `EditStudentDialog`.
- [ ] F7: Final copy for the first-access page and the status labels.
- [ ] F9: Story set for the new component and the changed dialogs.
- Design frames created or changed in this run: none (see Q1).
