# Technical assessment (Web): Admin Panel

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/admin-panel/prd.md) (no web PRD
for this slug), [vertice-api assessment](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/admin-panel/assessment.md),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/admin-panel/assessment.md),
[`docs/specs/web-trainer-only-access/spec.md`](../../specs/web-trainer-only-access/spec.md) (touched)
Spec: not yet written (will be `docs/specs/admin-panel/spec.md`)

## 1. Summary

Overall risk: **High.**

**Design gate.** There is no web PRD, so there is no `Design:` line. Every admin screen is new,
so screens change. Step 4 drafted 38 frames and 4 reusable components in pen.dev (section
`rDhgL` "Web — Admin Panel", listed in §9). They are **drafted, awaiting owner approval**, which
is open question Q1 and a dependency in §7. Implementation must not start before that approval
(CLAUDE.md design gate).

**What it touches.** A second workspace inside the same Next.js app, served only on
admin.vertice.fit:
- its own login with a second factor and enrolment;
- a sliding 30-minute session with a 12-hour cap;
- a side-navigation layout;
- the screens: dashboard with a weekly chart, users table, two read-only profile shapes,
  suspend/reactivate dialogs, account e-mail actions, starter-catalog curation and promote,
  muscle groups, action history.

It also touches the trainer web in two small places. The trainer roster gets a "Suspenso"
badge (R46), and the trainer login shows the suspended message (R41).

**Top findings:**
- the web routes by path only and never by host (F1);
- role enforcement on trainer pages is client-side, after `/auth/me` loads, which is too late
  for an admin workspace (F2);
- the generic BFF proxy forwards any path with whichever cookie is present (F3);
- the admin sign-in is a multi-step flow with renewal timing (F4);
- every data screen depends on BFF routes and API RPCs that don't exist yet (F5).

| Id | Severity | One line |
|---|---|---|
| F1 | High | `src/proxy.ts` decides by path prefix only; both hosts must get disjoint route sets |
| F2 | High | Non-trainer sign-out happens client-side after `/auth/me`; admin pages need a server-side role check before render |
| F3 | High | `/api/bff/[...path]` relays any path with the session cookie; per-host path allow-lists and a separate admin cookie needed |
| F4 | High | Admin sign-in (password → code / enrolment) and sliding renewal are new client state with timing edges |
| F5 | Blocker (dependency) | No admin BFF route or API RPC exists yet; each slice is blocked on its upstream slice |

## 2. PRD coverage map

"admin app" = a new route group `src/app/(admin)/` plus `src/app/(admin-auth)/`, served only on
admin.vertice.fit.

| Rule | Lands on | Notes |
|---|---|---|
| R1 | new: `src/app/(admin-auth)/login` | F1 |
| R2 | new: admin dashboard route | Post-verify redirect |
| R3 | `src/app/api/auth/login/route.ts:31-37` | F9: once the BFF refuses ADMIN at `/auth/login`, the web must map the BFF's code to `APP_ONLY_MESSAGE` |
| R4 | new admin login | Same message as wrong password |
| R5 | `src/proxy.ts` host routing | F1, F2 |
| R6 | `src/proxy.ts` host routing | F1, F2 |
| R7 | not applicable to the web | API/BFF authority |
| R8 | new: code step screen | F4 |
| R9 | new: enrolment screen (QR) | F4, F11 |
| R10 | not applicable to the web | Ops |
| R11 | new: renewal + expiry handling | F4 |
| R12 | same | F4 |
| R13 | new admin layout | F6 |
| R14 | not applicable to the web | |
| R15 | not applicable to the web | No role UI |
| R16 | admin users list | BFF/API exclude admins |
| R17 | new: dashboard | `MetricCard` (kit) |
| R18 | same | |
| R19 | not applicable to the web | API definition |
| R20 | same dashboard | |
| R21 | new: weekly chart | F7 |
| R22 | new: most-used table | |
| R23 | same | Private tag |
| R24 | same | Muscle-group `Dropdown` |
| R25 | same | Page size select (F8) |
| R26 | same | Opens promote dialog |
| R27 | not applicable to the web | |
| R28 | new: users list | F8 |
| R29 | same | Filters |
| R30 | same | `useDebouncedValue` |
| R31 | same | |
| R32 | same | |
| R33 | new: client profile | |
| R34 | same | |
| R35 | new: trainer profile | |
| R36 | same | |
| R37 | profile links | |
| R38 | not applicable to the web | No edit controls |
| R39 | new: suspend dialog | Reason required |
| R40 | `src/lib/api/client.ts` 401 → sign-out | Existing behaviour |
| R41 | `src/app/(auth)/login/LoginForm.tsx` + admin login | F9 |
| R42 | same | |
| R43 | not applicable to the web | |
| R44 | new: reactivate dialog | |
| R45 | not applicable to the web | |
| R46 | `src/app/(app)/alunos/AlunosContent.tsx` | Badge (F10) |
| R47 | client profile action | |
| R48 | profile action | |
| R49 | same | Shows "e-mail enviado" only |
| R50 | client profile action + confirm | |
| R51 | none | |
| R52 | new: exercise form dialog | Reuse `src/lib/validation/exercises.ts` bounds |
| R53 | same | |
| R54 | not applicable to the web | |
| R55 | delete action | `EXERCISE_IN_USE` message |
| R56 | new: trainers' exercises tab | |
| R57 | same | No edit/delete controls |
| R58 | promote dialog (prefilled copy) | |
| R59 | not applicable to the web | |
| R60 | promote dialog error | `NAME_TAKEN` |
| R61 | new: muscle groups panel | |
| R62 | `ExerciciosContent.tsx:36`, `AddExerciseDialog.tsx:52`, `ExerciseDialog.tsx:64` (`staleTime: Infinity`) | F13: trainer tabs must pick up renames |
| R63 | same panel | No remove control |
| R64 | exercise form error | |
| R65 | muscle-group form error | |
| R66 | not applicable to the web | |
| R67 | not applicable to the web | |
| R68 | suspend/reactivate dialogs | |
| R69 | history screen | Read-only |
| R70 | not applicable to the web | |
| R71 | new: history screen | Filters, paged |
| R72 | not applicable to the web | Shows "Usuário removido" as sent |
| E1 | admin login → code → dashboard | |
| E2 | existing www login refusal | F9 |
| E3 | admin login | |
| E4 | admin login | |
| E5 | host routing | F1 |
| E6 | host routing | F1 |
| E7 | not applicable to the web | |
| E8 | code step error | |
| E9 | enrolment screen | |
| E10 | not applicable to the web | |
| E11 | expiry → login notice | F4 |
| E12 | same | |
| E13 | admin layout on phone | F6 |
| E14 | users list empty result | |
| E15 | users list "Sem treinador" | |
| E16 | profiles have no edit controls | |
| E17 | existing 401 handling | |
| E18 | login forms | F9 |
| E19 | login forms | |
| E20 | suspend dialog disabled confirm | |
| E21 | not applicable to the web | |
| E22 | trainer roster badge | F10 |
| E23 | reactivate dialog | |
| E24 | e-mail action success | |
| E25 | end-relationship confirm | |
| E26 | none | |
| E27 | not applicable to the web | |
| E28 | delete error | |
| E29 | delete success | |
| E30 | trainers' tab has no edit/delete | |
| E31 | promote flow | |
| E32 | promote error | |
| E33 | exercise form error | |
| E34 | muscle-group form error | |
| E35 | rename | |
| E36 | none | |
| E37 | not applicable to the web | |
| E38 | client profile | |
| E39 | history rendering | |
| E40 | not applicable to the web | |

## 3. Current state

The app is Next.js 16 with the App Router, React 19 and TanStack Query (`staleTime: 30_000,
retry: 1`, `src/app/providers.tsx:17-18`).
- **Route groups.** `(app)` holds the trainer workspace: `alunos`, `dashboard`, `exercicios`,
  `perfil`, `planos`. `(auth)` holds `login`, `cadastro`, `definir-senha`. The public pages and
  `api` sit beside them.
- **Edge proxy.** `src/proxy.ts:7-10` protects by path prefix and checks only that the
  `vertice_session` cookie exists, never which role or which host.
- **Session cookie.** It is httpOnly, `SameSite=strict` and host-only, kept 30 days with "remember
  me" (`src/lib/session.ts:6-20`).
- **Role enforcement.** It runs in the browser: `TermsConsentGate` reads `/auth/me` and signs a
  non-trainer out (`src/components/layout/TermsConsentGate/TermsConsentGate.tsx:38-50`). The
  login route refuses non-trainers before setting the cookie
  (`src/app/api/auth/login/route.ts:31-37`).
- **CSRF guard.** `src/lib/requestGuard.ts` admits only `Sec-Fetch-Site: same-origin`, or a
  matching `Origin` host, and its comment calls out that SameSite doesn't cover a sibling
  subdomain. So www and admin are already distinct origins for it.
- **BFF proxy.** `src/app/api/bff/[...path]/route.ts` relays any path the browser asks for, with
  the cookie's token.
- **Kit.** Badge, Button, Checkbox, DateField, Dialog, Dropdown, ListRowSkeleton, MetricCard,
  MultiSelect, PageLoadingOverlay, ProfileMenu, Skeleton, Spinner, Switch, TableRowSkeleton,
  TextField and Tooltip, generated from `Vertice Web.pen`. There is no table component, no side
  navigation and no chart library (`package.json` has none).
- **Typed calls.** `src/lib/api/*.ts` over the generated `src/lib/api/schema.ts`.

## 4. Findings by dimension

### PRD fit and the design gate

**F12 (Info).** Screens change: a whole new workspace plus two small trainer-web changes (R41,
R46). There is no web PRD, so design approval is Q1. The frames drafted in step 4 are listed in
the next dimension and §9.

### Upstream readiness (BFF/API dependency)

**F5 (Blocker, dependency).**
- **What:** No admin BFF route exists, and almost none of the upstream RPCs exist.
- **Where:** BFF assessment F3; API assessment F10; R17–R72.
- **Why it matters:** Nothing past the login shell can be built against a real contract. The
  types come from the BFF's `docs/openapi.json`.
- **Recommendation:** Build each slice after its BFF slice merges and `schema.ts` is
  regenerated. Storybook stories with fixtures can start once frames are approved.

### Screens and routing

**F1 (High). Host-based routing.**
- **What:** `proxy.ts` has no notion of host.
- **Where:** `src/proxy.ts:7-10,26-60`; R1, R5, R6, E5, E6.
- **Why it matters:** Without host rules, `/admin/...` pages render on www, and `/dashboard`
  renders on admin.vertice.fit.
- **Recommendation:**
  - Read the `Host` header first and pick that host's own lists of auth, protected and public
    paths.
  - Anything outside a host's list is a 404 on that host, not a redirect, so the other workspace's
    URL structure doesn't leak.
  - Use distinct route groups `(admin)` and `(admin-auth)` with paths that don't collide with
    trainer paths, such as admin pages under `/painel/...`, so a mistake fails visibly.
  - Configure the two hosts via env, like `BFF_URL`, never hard-coded.
  - Legal pages stay on www only; the admin panel links out to them.
  - **Route handlers are outside `proxy.ts`.** Its matcher excludes `/api`
    (`src/proxy.ts:61-65`), so host rules there never reach `/api/*`. Each handler checks the
    host itself through one shared helper (for example `src/lib/host.ts`), and answers 404 for
    the other host's handlers.
    - www only: `/api/auth/login`, `register`, `password/setup`, `logout`.
    - Admin host only: the new admin auth handlers (login, verify, enrol, renew, logout).
    - Both hosts: `/api/bff/[...path]`, with per-host allow-lists (F3).

    Without this, a trainer could post to `/api/auth/login` on admin.vertice.fit and get a
    `vertice_session` cookie on the admin host.

**F2 (High). A server-side role check before render.**
- **What:** Today a wrong-role session sees the shell until `/auth/me` returns, then gets signed
  out (`TermsConsentGate.tsx:38-50`). That was acceptable because the trainer login already
  refuses other roles.
- **Where:** `src/components/layout/TermsConsentGate/TermsConsentGate.tsx`; R5, R6.
- **Why it matters:** The PRD says "never sees any admin page". A client-side gate renders the
  layout, and possibly cached data, before deciding.
- **Recommendation:**
  - The admin layout is a server component that calls the BFF `/auth/me` with the admin cookie.
    It redirects (no admin token) or 404s (wrong role) before any admin markup is sent.
  - The edge proxy only checks the admin cookie exists. It can't verify the JWT without the
    secret, so the layout is where the role is decided.
  - Add the same server-side check to the trainer layout as defence in depth.

### Design system and the Pencil sync

**F6 (Medium). Missing kit pieces.**
- **What:** The panel needs a data table with paging (users, most-used, history), a side
  navigation, a textarea (suspend reason), a code input and a chart. None are in the kit.
- **Where:** `src/components/ui/`; R13, R21, R25, R28, R39, R71.
- **Why it matters:** Hand-built one-offs drift from the `.pen` file. The kit is meant to be
  generated from it (CLAUDE.md).
- **Recommendation:** Add `DataTable`, `SideNav`, `TextArea` and `CodeInput` to the kit from the
  approved frames, each with stories, and run `pencil-design-audit` afterwards. Admin-only
  layouts go under `src/components/layout/AdminShell`.

**Design frames (step 4).** pen.dev accepted the calls this time. A new section `rDhgL` "Web —
Admin Panel" in `Vertice Web.pen` now covers every screen state the PRD introduces, listed in §9.
- No existing frames were reused, because none existed for this feature, and no existing frame
  was changed.
- The frames are built from existing kit components: Metric Card `rHcFo`, Button `vi3EM`, Text
  Field `MsIFr`, Dropdown `S8v0qW`, MultiSelect `Pzd0l`, Skeleton Block `bt6KG`, Table Row -
  Loading `U8EYgf`.
- They add four reusable pieces that map onto F6's new kit components: Admin Sidebar `izLYp`,
  Admin Badge `vzj0m`, Admin Toast `jjLsR`, Admin Pagination `a8AGY`.

All frames are **drafted, awaiting owner approval**, and do not satisfy the design gate. The
drafting agent made three choices the PRD didn't specify, which the owner should confirm with the
frames:
- the admin login has no "Esqueceu a senha?" link, which fits R10 and the platform-team reset;
- ending a relationship asks no reason, which the PRD doesn't require;
- the 2FA QR code is an icon placeholder.

### Data fetching and cache invalidation

**F13 (Medium).**
- **What:**
  - Suspend and reactivate must invalidate the users list and the profile.
  - Exercise writes must invalidate the catalog lists, the most-used table and muscle groups.
  - Every admin write must invalidate the history.
  - Dashboard figures can use the default `staleTime`.
- **Where:** `src/app/providers.tsx`; R39, R44, R52–R61, R71.
- **Why it matters:** Stale "Ativo" badges after a suspension confuse the operator.
- **Recommendation:** Give admin query keys their own `["admin", ...]` prefix and invalidate by
  prefix per resource. Don't reuse trainer query keys: different shapes, different session.
- **Trainer tabs and renamed muscle groups (R62).** Trainer screens query `muscleGroupsQueryKey`
  with `staleTime: Infinity` (`ExerciciosContent.tsx:36`, `AddExerciseDialog.tsx:52`,
  `ExerciseDialog.tsx:64`). `src/lib/api/muscleGroups.ts:4` assumes "the platform team changes
  rarely". Once admins add and rename groups, an open trainer tab keeps the old names until a
  reload. Give those queries a finite `staleTime`, such as the 30 s default or a few minutes, and
  update the comment.

### API client and validation

**F8 (Medium). Admin typed wrappers and form validation.**
- **What:** New `src/lib/api/admin*.ts` wrappers over the generated types. The exercise form can
  reuse `src/lib/validation/exercises.ts`'s bounds. Page size is limited to 10, 25 or 50 (R25).
- **Where:** `src/lib/api`, `src/lib/validation`; R25, R28, R52.
- **Why it matters:** Reusing the trainer bounds keeps the admin and trainer forms consistent with
  the API's limits.
- **Recommendation:** Add a reason schema with the API's size cap, and one cursor-paging hook
  shared by the three tables. `useLoadMoreRef` exists, but these are tables with page controls,
  not infinite lists.

### Error handling and session edges

**F4 (High). The admin sign-in and session are new client state.**
- **What:**
  - Password, then a challenge, then enrolment (first time) or the code. The challenge expires in
    minutes.
  - The admin token lasts 30 minutes and renews on activity, capped at 12h (BFF F2).
  - A 401 anywhere means sign-out with the "Sua sessão expirou" notice.
- **Where:** new admin login, `src/lib/api/client.ts` 401 handling, `src/lib/session.ts`; R8, R9,
  R11, R12, E8, E9, E11, E12.
- **Why it matters:** Renewing on every request floods the BFF. Renewing on a timer keeps an idle
  tab alive, which defeats R11. A challenge expiring mid-enrolment needs a clear restart.
- **Recommendation:**
  - Renew from the admin's real interactions (navigation, a mutation, focus with input), at most
    once every few minutes, only while the token is valid. Never renew from a background timer.
  - Keep the challenge in its own short-lived httpOnly cookie, set by the admin login route
    handler and cleared after verify.
  - Store the admin token in a separate `__Host-` cookie without `maxAge` (no "remember me").
  - Handle expiry and an invalid challenge with a single "start again" state.
  - **Make the 401 path host-aware.** Today `failure()` in `src/lib/api/client.ts:66-80`
    always posts `/api/auth/logout`, which clears only `vertice_session`, then goes to `/login`.
    On the admin host that leaves the admin cookie in place, and `/login` is a 404 there (F1).
    The "Sua sessão expirou" notice doesn't exist yet either. The handler and the logout route
    have to clear the current host's own cookie and send the admin to the admin login with the
    expiry notice. The R40/E17 "existing behaviour" holds for the trainer host only.

**F3 (High). The generic BFF proxy.**
- **What:** `/api/bff/[...path]` relays any path with the current cookie
  (`src/app/api/bff/[...path]/route.ts:14-45`).
- **Where:** as cited; R5–R7.
- **Why it matters:** On www, a trainer page could be made to call `/admin/...`. The BFF refuses
  by role, but the web shouldn't offer it. On the admin host, the proxy would also relay trainer
  paths with the admin token.
- **Recommendation:** Give each host its proxy prefix allow-list (admin host: `/admin/*`,
  `/auth/me` and `GET /muscle-groups`; www: everything but `/admin/*`). The admin screens need
  the muscle-group list for the R24 filter, the exercise form (R52, R53) and the groups panel
  (R61). Today it comes only from `GET /muscle-groups` (any role), and the BFF assessment adds no
  admin GET. Each reads only its own cookie, so an admin token
  is never sent from www and a trainer token never from admin.

**F9 (Medium). The suspended message on both logins.**
- **What:** The trainer login and the admin login must show "Sua conta está suspensa. Entre em
  contato com o suporte." for 403 `ACCOUNT_SUSPENDED` (BFF F6). The trainer login must keep
  refusing admins with its existing message.
- **Where:** `src/app/api/auth/login/route.ts`, `src/app/(auth)/login/LoginForm.tsx`, `src/lib/api/errorMessages.ts`; R41, E18.
- **Why it matters:** Without its own mapping, the suspended code falls through to a generic error
  message.
- **Recommendation:** Add the code to `errorMessages.ts` and relay it through the login route.
- **The admin message on www (R3, E2).** BFF F1 has `/auth/login` refuse ADMIN outright. If it
  answers with the generic 401, the web's 403 `TRAINERS_ONLY` branch
  (`src/app/api/auth/login/route.ts:31-37`) never runs for an admin. The admin would then see "E-mail ou
  senha inválidos" instead of today's message, which breaks R3 ("refused as today") and
  web-trainer-only-access R5/E8. Assumed: the BFF answers an ADMIN's correct password there with
  a distinct code (A3, the owner's decision), and the web maps it to `APP_ONLY_MESSAGE` as it does
  for clients.

**F10 (Low). The trainer roster badge.**
- **What:** The roster shows a "Suspenso" `Badge` when the BFF's additive `suspended` flag is true.
- **Where:** `src/app/(app)/alunos/AlunosContent.tsx`; R46, E22.
- **Why it matters:** It is the only way a trainer learns their client is suspended.
- **Recommendation:** Ship it with slice 2.

### State complexity

**F14 (Info).** Apart from the sign-in (F4), every admin screen is a list, a read or a dialog
form. There is no autosave or draft state like the workout editor's. Plain `react-hook-form` plus
query mutations is enough.

### Copy and localization

**F15 (Low).**
- **What:** The PRD fixes some copy: "E-mail ou senha inválidos", the suspended message,
  "Suspenso". The rest (action names in history, empty states) needs labels.
- **Where:** `src/lib/validation/exerciseSets.ts:30` (`setStrategyLabels`, the label-map pattern); R41, R46, R71.
- **Why it matters:** Hard-coded strings make history rows inconsistent with the actions.
- **Recommendation:** Map each history action code to one Portuguese label, exhaustive over the
  contract's enum (as `ROLE_LABELS` in `AppHeader.tsx:12` is over `Role`).

### Testing

**F16 (Medium).**
- **What:** These need tests:
  - unit tests for the host routing table (each host × path) and the proxy allow-lists;
  - stories for every new kit component and admin screen state (loading, empty, error);
  - unit tests for the renewal throttle and its expiry rule;
  - the login route's mapping of suspended and non-admin answers.
- **Where:** `src/proxy.test.ts` (exists), Storybook-as-Vitest project; F1, F3, F4.
- **Why it matters:** Host and proxy separation is the security boundary on the web side.
- **Recommendation:** Extend `src/proxy.test.ts` into a host × path matrix.

### Performance and loading UX

**F7 (Medium). The weekly chart needs a library decision.**
- **What:** No chart library exists, and R21 needs a 12-week, two-series chart.
- **Where:** `package.json`; R21.
- **Why it matters:** A heavy charting dependency loaded on the admin host only is acceptable, but
  it must not enter trainer bundles.
- **Recommendation:** A small hand-rendered SVG (two series, 12 points) is enough. If a library is
  chosen, load it dynamically in the admin route group only. Use `Skeleton`/`TableRowSkeleton`
  for loading states, as the trainer lists do.

### Effort, risk, and dependencies

See §7.

## 5. Options

**Same app vs a separate admin app.** The owner stated "inside vertice-web-react" (API PRD §9),
so the panel lives in this repo. A separate Next.js deployment from the same repo would give the
strongest isolation (no shared routes or proxy at all), but it doubles the CI/deploy pipeline.
The recommended approach is one app with host routing (F1–F3), which meets the PRD and keeps one
deploy.

## 6. Testing strategy

- **Unit:**
  - the host × path routing matrix;
  - per-host proxy allow-lists, and the host check on every `/api/*` handler;
  - the 401 path clearing the right host's cookie and landing on that host's login;
  - each host reads only its own cookie;
  - the renewal throttle (no renew from idle, refuse past expiry);
  - the error-code to message mapping, including `ACCOUNT_SUSPENDED`, `NAME_TAKEN` and
    `EXERCISE_IN_USE`.
- **Stories:**
  - kit: `DataTable`, `SideNav`, `TextArea`, `CodeInput`;
  - admin screens in loaded, loading, empty and error states;
  - the suspend dialog's disabled-until-reason state;
  - the promote dialog prefilled;
  - the trainer roster badge.
- No admin screen has test coverage today (none exist). Every new screen ships with stories.

## 7. Effort and risk

**Size: L.** The work is:
- about 10 screens and 6 dialogs;
- 4 new kit components;
- a sign-in flow with renewal;
- host routing and proxy separation;
- infra: a new host on the same service (vertice-devops).

Dependencies:
- **Design approval** of the drafted frames (Q1). Implementation can't start before it.
- Each **BFF slice** merged and `schema.ts` regenerated (F5).
- The **admin.vertice.fit DNS, certificate and routing**.

Risk: F4's renewal timing. Also, the kit components have to be generated from approved `.pen`
frames, which depends on pen.dev being available.

## 8. Questions and assumptions

- **Q1.** Do you approve the drafted admin frames (§9)? Until then the design gate is not met.
- A1. Admin pages live under a path prefix that doesn't collide with trainer pages, such as
  `/painel` (F1).
- A2. The weekly chart is a small hand-made SVG, not a library (F7).
- A3 (decided by the owner): on www, the BFF refuses an admin's correct password with a
  distinct code that the web maps to today's message, which keeps R3 as written (F9; BFF
  assessment F1).

## 9. Inputs to the spec

- [ ] F5: Slice order and the BFF routes each slice consumes.
- [ ] F1: Host detection, the per-host route tables (pages in `proxy.ts`, `/api/*` handlers via a shared host check), the admin path prefix, 404 for the other host's paths.
- [ ] F2: The server-side role check in the admin (and trainer) layout before render.
- [ ] F3: Per-host BFF proxy allow-lists (admin host includes `GET /muscle-groups`) and per-host cookies.
- [ ] F4: The sign-in state flow, challenge storage, admin cookie, the renewal trigger and throttle, expiry handling, and a host-aware 401/logout path.
- [ ] F6: New kit components and their source frames.
- [ ] F7: How the chart is drawn.
- [ ] F8: Admin API wrappers, the shared table paging hook, the reason schema.
- [ ] F9: Suspended-message handling on both logins, and how an admin refused on www keeps today's message (A3).
- [ ] F13: Admin query keys and invalidation per write, and a finite `staleTime` for trainer muscle-group queries.
- [ ] F16: The routing and proxy test matrix.
- [ ] Design frames: build against these once the owner approves them. All are **drafted, awaiting
  owner approval**, in section `rDhgL` "Web — Admin Panel" of `Vertice Web.pen`.
  - Components (`av00E`): Admin Sidebar `izLYp`, Admin Badge `vzj0m`, Admin Toast `jjLsR`, Admin
    Pagination `a8AGY`.
  - Acesso (`FnC0Y`): Login `xtHYu`, Login — erro `KV3fb`, Sessão expirada `cb0r1`, 2FA cadastro
    `Cv0BV`, 2FA cadastro — código inválido `p5TLVn`, 2FA código `duiOr`, 2FA código — erro
    `q9XrXD`.
  - Dashboard (`MXnYT`): Dashboard `En3Ju`, carregando `rNMsp`, tabela vazia `lSQne`, celular
    `qzCk9`.
  - Usuários (`zWk2M`): Usuários `ETgH1`, carregando `i6hSFx`, busca sem resultado `BVZe4`,
    celular `fXng6`, Menu aberto (celular) `jJXT5`.
  - Perfis (`u1QXx`): Perfil do aluno `M3SiW`, Perfil do aluno — e-mail enviado `fp164`, Perfil
    do treinador `eUOyS`, Perfil do treinador — suspenso `d4tAve`.
  - Diálogos (`dxxyj`): Suspender vazio `oY0tG`, Suspender preenchido `mS7wU`, Reativar vazio
    `HCHVB`, Reativar preenchido `GOUMA`, Encerrar vínculo `x81nY`, Avisos (toasts) `bHWbL`.
  - Exercícios (`lD9fy`): Catálogo inicial `c53jx`, erro ao excluir `LWZZa`, Exercícios dos
    treinadores `iiou2`, Grupos musculares `D2koD`, Novo exercício `Ef6Bz`, Editar — nome
    duplicado `a5D2r`, Promover ao catálogo `I6NIe`.
  - Histórico (`AOlPd`): Histórico `TExWT`, sem resultados `ZCKW9`.
