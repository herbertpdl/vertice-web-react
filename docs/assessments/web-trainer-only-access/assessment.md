# Technical assessment (Web): Web Access for Trainers Only

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/web-trainer-only-access/prd.md)
(source; no web PRD exists for this slug),
[vertice-api assessment](https://github.com/herbertpdl/vertice-api/blob/main/docs/assessments/web-trainer-only-access/assessment.md),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/web-trainer-only-access/assessment.md)
(its F1 option A puts R1–R7 in this repo; its F2/F4 define the new setup response)
Spec: not yet written (will be `docs/specs/web-trainer-only-access/spec.md`)

## 1. Summary

Overall risk: Medium.

**Design gate.** The source PRD changes two screens: the login refusal and the client variants
of "Senha definida". The owner asked for the pen.dev frames to be produced during this
assessment, and §9 lists them. The owner approved them on 2026-10-24 (`Design: design-ok` in the
source PRD's header), so implementation is not gated.

**What it touches.** This repo carries most of the feature:
- The login route refuses a non-trainer before it mints the session (R1–R5).
- The edge proxy and the BFF proxy route refuse a non-trainer session (R6, R7).
- "Senha definida" gets a client variant. On a phone it has "Abrir o app" (a deep link with the
  e-mail filled in) and store links; on a computer, a QR code (R10–R10d).

The hard parts:
- **Knowing the role on every request.** Today the proxy checks only that the cookie exists
  (F1).
- **Telling a phone from a computer**, without a hydration mismatch (F4).
- **The deep link**, which needs a mobile change and has no fallback on iOS when the app is
  missing (F5).

| Id | Severity | One line |
|---|---|---|
| F1 | High | The web never knows the session's role: the proxy only checks that the cookie exists, so R6/R7 need a role check on every request |
| F2 | High | The client success screen depends on the BFF's new `{role, email}` setup response, which needs a vertice-api RPC that doesn't exist yet |

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R1 | `src/app/api/auth/login/route.ts:9-29` must change (F3) | Refuse a non-TRAINER `data.user.role` before `setSession` (`:27`) |
| R2 | same (F3) | No cookie is set; the BFF token is discarded |
| R3 | `src/app/(auth)/login/LoginForm.tsx:130-133` must change (F3) | New message for the new error code |
| R4 | existing: `LoginForm.tsx:131` | A 401 maps to "E-mail ou senha inválidos" before any role exists |
| R5 | same as R1 (F3) | ADMIN gets the same refusal and message (PRD §7) |
| R6 | `src/components/layout/TermsConsentGate/TermsConsentGate.tsx:29,43-63` and `src/components/layout/AppHeader/AppHeader.tsx:23-38` must change (F1) | The gate already loads `me` and fails closed; add the role |
| R7 | same (F1); logout via the existing `/api/auth/logout` path (`src/lib/api/client.ts:65-75`) | A non-TRAINER `me` → log out → `/login` with the R3 message |
| R8 | none | Trainer flows unchanged; F1's check passes them through |
| R9 | existing: `src/app/(auth)/definir-senha/SetPasswordForm.tsx`, `src/proxy.ts:12` (public path) | Unchanged |
| R10 | `SetPasswordForm.tsx:104-127` must change (F2) | Success state branches on `role` |
| R10a | `SetPasswordForm.tsx` (new client variant) (F5) | "Abrir o app" → `verticemobile://login?email=…` |
| R10b | same | Store links, phone only (F4) |
| R10c | same (F4, F7) | QR code, computer only |
| R10d | new: a config value for the QR's store-picking link (F7) | One link for both stores |
| R10e | same (F7) | Placeholders until the app is published |
| R11 | existing: `SetPasswordForm.tsx:104-127` | The trainer keeps today's state ("Ir para o login") |
| R12–R16 | not applicable to the web | Enforced by the BFF and vertice-api (their assessments) |
| R17 | not applicable to the web | Server-side proof, in the BFF and API test suites |
| E1 | F3 | See R2, R3 |
| E2 | existing (`LoginForm.tsx:131`) | See R4 |
| E3 | `src/proxy.ts:31-44` (existing redirect) + F3 | Signed out → `/login?redirect=…` → refused at login |
| E4 | F1 | See R7 |
| E5 | not applicable to the web | Server-side |
| E6 | F2, F5 | See R10, R10a |
| E7 | existing | See R11 |
| E8 | F3 | See R5 |
| E9 | existing: `src/app/api/auth/register/route.ts:26` (always TRAINER), 409 relayed | Unchanged |
| E10 | none | Unchanged |
| E11 | F5 | On iOS a custom scheme with no app installed fails with a system alert, not silently |
| E12 | F5 + vertice-mobile | The mobile `/login` doesn't read an e-mail parameter today |
| E13 | existing | See R4 |
| E14 | F4 | See R10c |
| E15 | F7 | See R10e |
| E16 | F7 | The store-picking link (a store-side "smart link" or a small redirect on the web's domain) is the spec's choice |

## 3. Current state

- **Session**: `src/lib/session.ts:8-21` stores the BFF token in the httpOnly `vertice_session`
  cookie. The web holds no `JWT_SECRET` and never decodes the token. `src/proxy.ts:26-58` decides
  everything on cookie presence (`request.cookies.has(SESSION_COOKIE)`). It redirects a
  signed-out visit to a protected prefix to `/login?redirect=…`, and a signed-in visit to
  `/login`/`/cadastro` away from them.
- **Protected prefixes** are `/dashboard`, `/alunos`, `/planos`, `/exercicios` (`src/proxy.ts:8`).
  `/perfil`, also under `src/app/(app)/`, is missing (F6).
- **Login route** (`src/app/api/auth/login/route.ts`): posts to the BFF, relays any error, and
  on success calls `setSession` and returns `{user}`. It has a unit test (`route.test.ts`).
- **BFF proxy route** (`src/app/api/bff/[...path]/route.ts`): forwards with the cookie's token.
  It only refuses when there is no token (`:24-30`).
- **Set password** (`SetPasswordForm.tsx`): on success it shows "Senha definida" with an
  "Ir para o login" link (`:104-127`). `submit` resolves to nothing, because the BFF returns 204.
- **Role in the UI**: only `perfil/ProfileContent.tsx:108,319` reads `me.role`. The `(app)`
  layout (`src/app/(app)/layout.tsx`) does not.
- No QR library is installed (`package.json` dependencies are next, react, react-query,
  react-hook-form, zod, lucide-react, @hookform/resolvers). The CSP allows `img-src 'self' blob: data:`
  (`src/lib/csp.ts:29`).
- The mobile app declares the `verticemobile` scheme (`vertice-mobile/app.json:8`). Its
  `src/app/login.tsx` reads no search parameters.

## 4. Findings by dimension

### 1. PRD fit and the design gate

**F8 — Info — The design gate**
- **What**: The source PRD is vertice-api's, which has no `Design:` line. The owner asked for the
  frames to be made now (§9). Approval is a separate step.
- **Where**: §9; Q1.
- **Why it matters**: This repo's web PRDs block implementation until `design-ok`
  (`docs/prds/create-workout-with-exercises/prd.md:287-288`).
- **Recommendation**: Resolved: approved by the owner on 2026-10-24. The spec cites the frames in
  §9 and that date.

The PRD gained R10c–R10e and E14–E16 during this assessment, at the owner's request: the QR code,
its single store-picking link, and the placeholders. It has no open questions.

### 2. Upstream readiness (BFF/API dependency)

**F2 — High — The client success screen needs a response that doesn't exist yet (R10, R10a, R11)**
- **What**: `POST /api/auth/password/setup` returns 204 today. The BFF's F4 changes it to 200
  `{role, email}`, backed by a new vertice-api RPC (API F1).
- **Where**: `src/lib/api/auth.ts:49` (`setupPassword`), `SetPasswordForm.tsx:94-101` (`submit`);
  `src/app/api/auth/password/setup/route.ts:20-25` relays it as is.
- **Why it matters**: Without the role, the screen cannot choose between the client and trainer
  variants. Guessing either way breaks R10 or R11.
- **Recommendation**: Build after the BFF ships. Regenerate `src/lib/api/schema.ts` from the
  BFF's `docs/openapi.json`, then type `setupPassword` to return `{role, email}`. The relay route
  needs no change. The login refusal (F3) and the session guard (F1) have no upstream dependency
  and can ship first.

### 3. Screens and routing

**F1 — High — The web never checks the session's role (R6, R7, E3, E4)**
- **What**: `src/proxy.ts` only checks that the cookie exists. Inside `(app)`, `TermsConsentGate`
  loads `GET /auth/me` (`useCurrentUser`, `:29`) and fails closed until `me` arrives (`:43-63`),
  but it looks only at consent, never at `me.role`. `AppHeader` renders outside the gate, with the
  trainer navigation (`:23-26`). After F3 no new client session can be created, but an existing
  one, or a token put in the cookie by hand, still renders every trainer page.
- **Where**: `src/components/layout/TermsConsentGate/TermsConsentGate.tsx:29,43-63`;
  `src/components/layout/AppHeader/AppHeader.tsx:23-38`; `src/app/(app)/layout.tsx`;
  `src/proxy.ts:26-58`.
- **Why it matters**: Without a role check, R6 and R7 hold only because no client happens to
  have a session.
- **Recommendation**: See §5. Preferred is option D: extend the gate the `(app)` layout already
  has, so it renders children only when `me.role === "TRAINER"`. For any other role it calls the
  existing logout (`/api/auth/logout`, as `apiClient` does on a 401) and hard-navigates to
  `/login?motivo=app`, where the login shows the R3 message. This needs no extra request: `me` is
  already fetched on every `(app)` page. The role is the authoritative one, because vertice-api
  re-reads it from the database. It needs no token decoding and no BFF contract change. Move
  `AppHeader` under the gate, or have it render only once `me` is a trainer, so no trainer
  navigation shows "even briefly".

**F3 — Medium — The login refusal (R1–R5, E1, E8)**
- **What**: `route.ts` sets the session for any role.
- **Where**: `src/app/api/auth/login/route.ts:24-28`; `LoginForm.tsx:130-133`.
- **Why it matters**: This is the exact path the owner hit.
- **Recommendation**: After a 2xx from the BFF, a non-TRAINER role returns the web's own 403 with
  a web-only error code, and no `setSession`. `loginErrorMessage` maps that code to
  "O acesso de alunos é feito somente pelo aplicativo Vertice." R4 holds without extra work: a
  wrong password is a 401 before any role is known. The e-mail stays in the field, and the
  password is cleared, as in the frames.

**F6 — Low — `/perfil` isn't a protected prefix**
- **What**: `PROTECTED_PREFIXES` (`src/proxy.ts:8`) omits `/perfil`, so a signed-out visit
  renders the page shell instead of redirecting to `/login`.
- **Where**: `src/proxy.ts:8`; `src/app/(app)/perfil/`.
- **Why it matters**: A signed-out visit should redirect from every `(app)` route, not only some. A prefix list that
  must be kept in step with the folders is how `/perfil` was missed.
- **Recommendation**: Add `/perfil`, or invert the check (everything except the auth, public and
  legal paths) so a new `(app)` folder can't be missed.

### 4. Design system and the Pencil sync

**F7 — Medium — QR code and store badges are new UI with no kit component (R10b, R10c, R10d)**
- **What**: The kit has no QR code or store-badge component, and no QR library is installed. The
  QR code's target is a placeholder until the app is published (R10d).
- **Where**: new: a small domain component under `src/components/domain/` (an "app download"
  block); `src/lib/csp.ts:29` (`img-src … data:` already allows an inline image).
- **Why it matters**: A QR library is a new runtime dependency. A pre-generated image must be
  regenerated whenever the placeholder becomes the real link.
- **Recommendation**: Keep the store URLs and the QR target in one config value (a
  `NEXT_PUBLIC_*` variable or a constant module), so publishing the app is a config change. For
  the QR code, either:
  - commit an SVG generated from that URL, which needs no dependency but must be regenerated when
    the URL changes, or
  - render it with a small, maintained QR library.

  Prefer the library only if the URL is going to be configurable per environment. Either way it
  is a domain component with stories, not a `ui` kit addition, so `pencil-design-audit` does not
  apply.

Frames: see §9.

### 5. Data fetching and cache invalidation

Nothing found. Checked: login and setup are plain mutations outside React Query's cache. F1's
redirect clears the cookie before any `(app)` query runs, so no cached trainer data survives into
a refused session. `src/app/providers.tsx` defaults are not involved.

### 6. API client and validation

Nothing found beyond F2's type regeneration. Checked: `src/lib/api/auth.ts:49`, and
`src/lib/validation/auth.ts` (unchanged: the login body is the same).

### 7. Error handling and session edges

**F5 — Medium — The deep link has no graceful fallback, and the mobile app doesn't read it yet (R10a, E11, E12)**
- **What**: "Abrir o app" would be a link to `verticemobile://login?email=…`. iOS Safari shows a
  "cannot open the page" alert when nothing handles a custom scheme. Android shows nothing or an
  error. The mobile `src/app/login.tsx` reads no search parameters, so the e-mail would not be
  filled in.
- **Where**: new link in `SetPasswordForm.tsx`; `vertice-mobile/app.json:8`;
  `vertice-mobile/src/app/login.tsx`.
- **Why it matters**: E11 expects the store links to be the way forward, but on iOS the client
  first sees a system error. E12 does not work without a mobile change.
- **Recommendation**: Ship the custom scheme now, since the app is unpublished and universal
  links need a published app plus files hosted on the web's domain. Place the store links directly
  under the button so the fallback is visible before the tap. Record universal/app links as a
  follow-up. The mobile app needs a small change (read `email` on `/login`); flag it in the spec's
  merge order. Because the e-mail travels in a URL (API F5), percent-encode it, and never put the
  setup token in the link.

### 8. State complexity

**F4 — Medium — Phone vs computer (R10a–R10c, E14)**
- **What**: The client variant shows different content on a phone and on a computer. The page is
  server-rendered, so user-agent detection on the server and `matchMedia` in an effect both risk
  a hydration mismatch or a flash of the wrong variant.
- **Where**: `SetPasswordForm.tsx` (client component; the success state renders after a client
  action, never on first paint).
- **Why it matters**: A wrong guess shows a QR code to a phone, which can't scan itself, or a
  useless deep link to a computer.
- **Recommendation**: The success state only appears after submit, so it never renders on the
  server. Deciding once at that moment with `matchMedia("(pointer: coarse)")` is safe and needs no
  user-agent parsing. Alternatively, render both blocks and toggle them with a CSS media query on
  `pointer`/`hover`, which needs no JavaScript. Either way, a tablet counts as a phone.

### 9. Copy and localization

Nothing found. Checked: the new strings are the PRD's ("O acesso de alunos é feito somente pelo
aplicativo Vertice.", "Abrir o app") and the frames' captions. They are inline Portuguese like the
rest of `LoginForm`/`SetPasswordForm`, and no label map is involved.

### 10. Testing

Covered in §6.

### 11. Performance and loading UX

Nothing found. Checked: option D of F1 adds no request (it reuses the gate's `me`). The success screen's variants need no
loading state beyond today's submit spinner.

### 12. Effort, risk, and dependencies

See §7.

## 5. Options

For F1 (knowing the role per request):

- **A. Read the token's `role` claim, unverified, in `src/proxy.ts`.** Redirects before any
  render, with no request. It depends on the BFF agreeing the claim is a contract, which today it
  says to treat as opaque (`vertice-bff/docs/api-contract.md:10-13`). A forged claim only ever
  shows an empty shell, because the BFF verifies the signature.
- **B. Call `GET /auth/me` server-side for each `(app)` page.** Authoritative, but adds a BFF
  round trip per navigation on top of the one the gate already makes.
- **C. A second cookie holding the role, written at login.** Unsigned unless the web gets its own
  secret, and it can drift from the token.
- **D. Extend `TermsConsentGate` to require TRAINER (recommended).** It reuses the `me` every
  `(app)` page already loads, uses the authoritative role, and changes no contract. The cost is
  that the redirect happens client-side after `me` loads. Until then the gate shows its existing
  loading state, never the page, which still satisfies R6.

Recommendation: **D**. Add A later only if a pre-render redirect is ever wanted.

## 6. Testing strategy

- `src/app/api/auth/login/route.test.ts`:
  - A CLIENT or ADMIN `user.role` returns the refusal code, sets no cookie, and doesn't leak the
    BFF token.
  - A TRAINER still gets a session.
  - A 401 is relayed unchanged (R4).
- `TermsConsentGate` stories (it has a `*.stories.tsx` under `src/components/layout/`, or add one):
  - A CLIENT and an ADMIN `me` never render children and trigger the logout.
  - A TRAINER with the current consent renders children.
  - The loading state shows no page content.
- `src/proxy.test.ts`: `/perfil` is protected (F6), and `/definir-senha` stays public with a
  session.
- `LoginForm` with `?motivo=app` shows the R3 message.
- `LoginForm.stories.tsx`: the refusal message state (play test on the mocked 403).
- `SetPasswordForm.stories.tsx`:
  - client on a phone (button plus store links, no "Ir para o login")
  - client on a computer (QR code only)
  - trainer (unchanged)
  - the `matchMedia` or CSS choice mocked per story
- The new app-download domain component gets its own stories.
- Unit-test the deep-link builder (e-mail encoding), if it is a pure helper under `src/lib`.

## 7. Effort and risk

Size: **M**:
- One route handler, the consent gate and the header (F1, F3).
- One form gains three variants (F2, F4).
- One new domain component (F7).
- Story and unit coverage for each.

Risks: the QR library choice.

Dependencies:
- F2 waits on the BFF (F2/F4 there), which waits on vertice-api (F1 there).
- F5's prefilled e-mail waits on a vertice-mobile change.
- F1 and F3 have no upstream dependency and can ship first. They are the actual fix for what the
  owner hit.

## 8. Questions and assumptions

- **Q1.** Resolved: the owner approved the frames in §9 on 2026-10-24.
- **Q2.** Resolved: one link that picks the store by phone type (PRD R10d).

## 9. Inputs to the spec

- [ ] F1: where the role is enforced (option D, the gate, preferred, or A/B/C), what a refused
  session gets (logout, `/login?motivo=app` with the R3 message), and how `AppHeader` avoids
  showing trainer navigation first.
- [ ] F2: sequence the success screen after the BFF's new setup response, and regenerate the types.
- [ ] F3: the login route's refusal code and status, and `LoginForm`'s message for it.
- [ ] F4: how phone vs computer is decided (`matchMedia` at success, or CSS media), and what a
  tablet gets.
- [ ] F5: the deep link format and encoding, the fallback placement, the mobile `/login` change,
  and universal links as a follow-up.
- [ ] F7: the config for the store URLs and the QR's store-picking link (who serves it: a
  third-party smart link or a redirect route on the web), and the QR rendering approach.

Design frames, created during this assessment in `/Users/herbertlago/Documents/Vertice Web.pen`,
section "Web — Acesso só para treinadores" (`kfvY1`, below "Web — Treinador: ajustes para o app
do aluno" `YICJ0`). No existing frame was changed.

| Frame | Id | Rules |
|---|---|---|
| Login — aluno recusado (1440×900) | `q2isIT` | R3, R5 (form-level error box `fvr1G`) |
| Senha definida — aluno (celular) (390×844) | `j2j1L` | R10, R10a, R10b |
| Senha definida — aluno (computador) (1440×900) | `NIGup` | R10, R10c (QR block `WLJtj`) |
| Senha definida — treinador (sem mudanças) (1440×900) | `J9F36n` | R11 |

Known differences between the frames and the code, for the owner's review (Q1) and the spec:
- The file had no "Definir senha" screen at all. `J9F36n` (trainer) and the computer frame's
  brand panel are rebuilt from `SetPasswordForm.tsx`, not confirmed against an earlier design.
- The design had no form-level error. The box in `q2isIT` is drawn from `LoginForm.tsx`'s styles
  as plain frames (`$color-danger` border, danger at 10% fill, `$radius-md`, 13px text), not a kit
  component. Build it from the existing `LoginForm` markup.
- `q2isIT` is a copy of the older Login design, so it still shows "Esqueceu a senha?" and the
  Google/Apple sign-in row, which `LoginForm.tsx` no longer renders. Build the error state only;
  ignore those two.
- The store badges are plain frames (no kit component), and the QR code is a placeholder icon
  (F7). No loading state was drawn: the file has no pattern for one on this screen.
