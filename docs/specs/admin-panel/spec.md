# Spec (Web): Admin panel

Status: Draft. Implementation follows in the slice tickets (VRT-25, VRT-26, VRT-29, VRT-32); this
document is the contract they are built against.
Design: design-ok. The owner approved the pen.dev section `rDhgL` "Web — Admin Panel" in
`Vertice Web.pen` on 2026-11-18, together with the three draft choices: the admin login has no
"Esqueceu a senha?" link, ending a relationship asks no reason, and the QR code in the frame is a
placeholder (the real screen draws it locally from the provisioning URI, §4).
Owner: hebertpdl@gmail.com
Related: [vertice-api PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/admin-panel/prd.md)
(Approved 2026-11-18; R1–R72, E1–E42, not restated here),
[vertice-api spec](https://github.com/herbertpdl/vertice-api/blob/main/docs/specs/admin-panel/spec.md)
(D1–D32),
[vertice-bff spec](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/admin-panel/spec.md)
(B1–B19, the REST contract this app consumes; it wins over this document on any route, field or
code), this repo's [assessment](../../assessments/admin-panel/assessment.md) (F1–F16, resolved in
§0), [`docs/specs/web-trainer-only-access/spec.md`](../web-trainer-only-access/spec.md) (touched:
R3, the www login). Tickets: VRT-18 (this spec), VRT-25, VRT-26, VRT-29, VRT-32; infra VRT-19.

The admin panel is a second workspace in this Next.js app, served only on `admin.vertice.fit`.
The web owns four things here: which host serves which page and handler, which cookie each host
reads, the admin sign-in and renewal flow in the browser, and the screens. Every rule about who
may do what is also enforced by the BFF and vertice-api; the web's job is to never offer the other
workspace, never carry one workspace's token on the other host, and never show admin markup
before the role is known.

## 0. Scope decisions

Each row resolves a finding of the assessment's §9 (every High, the Blocker and every Medium; the
Lows F10 and F15 too).

| # | Decision | Resolves |
|---|---|---|
| W1 | **Two workspaces, chosen by the `Host` header only.** `src/lib/host.ts` exports `workspaceOf(headers): "admin" \| "trainer"`: `admin` when the hostname part of `Host` (lower-cased, port dropped) equals `serverEnv().adminHost`, `trainer` for everything else, unknown hosts and the container health check's `localhost:3000` included (today's behaviour). `X-Forwarded-Host` is never read: CloudFront sets `Host` from the viewer's alias (§12), and a client can't pick another one. New env `ADMIN_HOST` (a bare hostname, parsed in `env.server.ts`): defaults to `admin.localhost` outside production and to **unset in production**, where unset means no host is the admin one, so every admin page and handler is a 404 until the task definition sets `ADMIN_HOST=admin.vertice.fit`. That fails closed and lets admin code merge before the infra exists. | F1 |
| W2 | **Admin pages live under `/painel`, and each host 404s the other's paths.** Admin routes: `/painel/entrar` (sign-in), `/painel` (dashboard), `/painel/usuarios`, `/painel/usuarios/[id]`, `/painel/exercicios`, `/painel/historico`. No trainer path starts with `/painel`, so a routing mistake fails visibly. `src/proxy.ts` reads the workspace first and applies that workspace's own table (§1). A path outside it answers a plain `404` from the proxy (`new NextResponse("Not Found", { status: 404 })`, which Next 16's proxy may return directly), never a redirect, so neither host reveals the other's URLs. The legal pages, `/definir-senha`, `/baixar-app` and `/suporte` stay on www only. `/healthz`, the `/icon.png` metadata route and Next's own paths (`/_next/**`, `/__nextjs*`, such as the dev server's `/_next/webpack-hmr`) pass on both hosts. | F1, R5, R6, E5, E6 |
| W3 | **Every `/api/*` handler checks the host itself.** The proxy's matcher excludes `/api`, so host rules there never reach the handlers. Each handler starts with `hostGuard(request, "trainer" \| "admin" \| "any")` from `src/lib/host.ts`, which answers `404 NOT_FOUND` for the wrong host, before `guardApiRequest`. www only: `/api/auth/login`, `/api/auth/register`, `/api/auth/password/setup`, `/api/auth/logout`. Admin only: the new `/api/admin/auth/{login,enroll,verify,renew,session,logout}`. Both: `/api/bff/[...path]` (W5). A source-scan unit test fails on any `src/app/api/**/route.ts` that doesn't call `hostGuard` (§10). Without this, a trainer could post to `/api/auth/login` on the admin host and get a `vertice_session` cookie there. | F1, F3 |
| W4 | **A server-side role check before any markup.** `src/app/(admin)/layout.tsx` is an async server component. It reads the admin cookie, calls the BFF's `GET /auth/me` server-side with it, and decides before rendering: no cookie → `redirect("/painel/entrar")`; a 401 → `redirect("/painel/entrar?motivo=expirou")`; a role other than `ADMIN` → `notFound()`. Only the `GET /auth/me` fetch is wrapped in try/catch, with `redirect()` and `notFound()` called outside it, since they work by throwing. A network error or a 5xx renders `AdminUnavailable` (a retry view with no admin data and no `AdminShell`) in place of the children. A segment's own `error.tsx` can't catch its layout's errors, so this is the fail-closed state. Only then does it render `AdminShell` with `me` and the token's times (§5) as props. The edge proxy only checks that the admin cookie exists, since it can't verify the JWT. The trainer layout `src/app/(app)/layout.tsx` gets the same server check as defence in depth: a non-`TRAINER` `me` gets no app markup, only `NonTrainerSignOut`, which clears the cookie and lands on `/login?motivo=app` (R7's message). Not `notFound()`: a layout can't clear the httpOnly cookie, so a 404 would strand it (the proxy bounces `/login` back to `/dashboard` while it exists). A 401 or an unreachable BFF there falls through to today's client handling (`TermsConsentGate` and the `apiClient` 401 path), because a layout can't clear a cookie and the trainer proxy would bounce `/login` back while the stale cookie is present. `TermsConsentGate` stays as it is. | F2, R5, R6 |
| W5 | **The BFF proxy has a per-host allow-list and reads only that host's cookie.** `src/lib/bffAllowList.ts` holds a pure `bffPathAllowed(workspace, method, upstreamPath)`. Admin host: any method on `/admin/**` except `/admin/auth/**`, plus `GET /auth/me`, `POST /auth/password`, `POST /auth/me/consent` and `GET /muscle-groups` (the BFF's B7 list). www: anything except `/admin` and `/admin/**`. `/admin/auth/**` is refused on both hosts, because the challenge and the admin token only move through the dedicated handlers of W7. A refused path answers `404 NOT_FOUND` before any cookie is read. The admin host reads only the admin cookie and www only `vertice_session`, so an admin token never leaves www and a trainer token never leaves the admin host. | F3, R5–R7 |
| W6 | **Separate cookies: an admin session and a short-lived challenge, both host-only.** In production the session is `__Host-vertice_admin` and the challenge `__Host-vertice_admin_challenge`. Both are `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, with no `Domain` (the `__Host-` prefix makes the browser enforce the last three). Outside production, where the dev server is plain http and `Secure` can't hold, they are `vertice_admin` and `vertice_admin_challenge`, the same way `vertice_session` drops `Secure` there. The session's `maxAge` is the seconds left until the token's `expiresAt`: there is no "remember me", and the cookie never outlives the token. The challenge's `maxAge` is the seconds left until `challengeExpiresAt`, at most 300. `src/lib/adminSession.ts` (server-only) is the one module that reads and writes them, as `src/lib/session.ts` is for `vertice_session`. | F3, F4, R11, R12 |
| W7 | **The admin sign-in is three route handlers and one screen.** The password step calls `/api/admin/auth/login`, which stores the challenge in its cookie and answers the browser only `{secondFactor, challengeExpiresAt}`, never the challenge itself. The enrolment step calls `/api/admin/auth/enroll`, which reads the challenge cookie and answers `{provisioningUri}`. The code step calls `/api/admin/auth/verify`, which reads the challenge cookie, sets the session cookie on success, clears the challenge and answers `{user, expiresAt, sessionEndsAt}`. The token is never in a body the browser sees. The steps are client state on the one `/painel/entrar` page (a pure reducer, §4), so a reload starts again at the password. | F4, R1, R2, R8, R9, E1, E8, E9 |
| W8 | **Renewal comes from the admin's real interactions, throttled, never from a timer.** `AdminShell` counts a `pointerdown` or `keydown` on the document, a route change and the start of a mutation, all only while the page is visible. Focus alone, scrolling, pointer moves, query refetches and timers never count. On one of these it posts `/api/admin/auth/renew`, at most once per 60 s per tab. That handler calls the BFF only when the token is at least 2 minutes old: it reads `iat` from the cookie's payload, which it doesn't verify, since the BFF verifies. So the BFF sees at most one renewal per 2 minutes per admin across tabs, and an idle admin is signed out between 28 and 30 minutes after the last interaction (R11). `sessionEndsAt` (12 h after the sign-in) never moves (R12). The one timer in the shell is a **sign-out** timer at `expiresAt`. It is re-armed after each renewal and checked again on `visibilitychange`, since background tabs throttle timers. It never renews. All tabs share one cookie, so another tab may have renewed it. Before signing out, the timer and the visibility check read `GET /api/admin/auth/session`, which reports the current cookie's times with no BFF call and is **not** a renewal. They re-arm when that answer's `expiresAt` is still ahead, and sign out only on a 401. An idle tab therefore never signs out the tab that is in use. | F4, R11, R12, E11, E12 |
| W9 | **The 401 path is host-aware.** `failure()` in `src/lib/api/client.ts` tells the workspace by the page's path, since only the admin host serves `/painel` (W2): on `/painel/**` it posts `/api/admin/auth/logout` (clears both admin cookies) and hard-navigates to `/painel/entrar?motivo=expirou`, which shows "Sua sessão expirou. Entre novamente." (frame `cb0r1`). Elsewhere it does today's `/api/auth/logout` → `/login`. The sign-out timer, a 401 from renew and "Sair" go through the same `signOutAdmin(reason)` helper. The admin proxy never redirects `/painel/entrar` away while a cookie is present, so a stale cookie can't loop (§1). | F4, R40, E11, E12, E17 |
| W10 | **Every BFF sign-in code has one screen state.** `CHALLENGE_INVALID`, a 409 `PRECONDITION_FAILED` at verify and a challenge past `challengeExpiresAt` at submit all go back to the password step with the expiry notice (one "start again" state). `INVALID_SECOND_FACTOR_CODE` shows "Código inválido" and keeps the challenge (frames `p5TLVn`, `q9XrXD`). A 409 at enroll (already enrolled) moves to the code step. A 429 shows `rateLimitedMessage` and keeps the submit disabled until `Retry-After` has passed. `ACCOUNT_SUSPENDED` shows the R41 text. A 401 at the password step shows "E-mail ou senha inválidos" (frame `KV3fb`), the same for a wrong password and for a trainer's or client's correct one (R4). | F4, F9, R4, R8, R41, E3, E4, E8, E18, E19 |
| W11 | **R3 on www: the login route maps `ADMIN_LOGIN_ELSEWHERE` to today's answer, and it ships in VRT-25, deployed before BFF VRT-28.** From VRT-28 on, the BFF answers an admin's correct password at `POST /auth/login` with 403 `ADMIN_LOGIN_ELSEWHERE` (BFF B9). `/api/auth/login` turns that into its own 403 `TRAINERS_ONLY` with `APP_ONLY_MESSAGE`, so `LoginForm` needs no change and R3/E2 read as today. 403 `ACCOUNT_SUSPENDED` is relayed, and `LoginForm` and the admin login show "Sua conta está suspensa. Entre em contato com o suporte." Both codes are route-local constants (`ADMIN_LOGIN_ELSEWHERE_CODE` in `src/lib/auth/trainerOnly.ts`, `ACCOUNT_SUSPENDED_CODE` and `ACCOUNT_SUSPENDED_MESSAGE` in a new `src/lib/auth/suspended.ts`) until VRT-29 takes the BFF types that name them and moves the suspended copy into `errorMessages`. This mapping is VRT-25's **first PR**: it needs neither VRT-19 nor any admin route, so it can merge alone and early. | F9, R3, R41, E2, E18; BFF §6 step 4 |
| W12 | **New kit components from the approved frames, and one reuse.** `SideNav` (Admin Sidebar `izLYp`), `Toast` (Admin Toast `jjLsR`, variants from `bHWbL`), `Pagination` (Admin Pagination `a8AGY`, adapted to cursors in W14), `DataTable` (the table cards of `ETgH1`, `c53jx`, `TExWT`, with `TableRowSkeleton` `U8EYgf` for loading), `TextArea` (the reason field of `oY0tG`) and `CodeInput` (the six cells of `Cv0BV`, `duiOr`). Admin Badge `vzj0m` has exactly `Badge`'s `neutral` values (`$color-surface-hover` fill, `$color-text-secondary`, padding 4/10, 11 px 600, full radius), so it is `Badge variant="neutral"`, not a new component. "Ativo" and "Suspenso" use `success` and `danger` as the frames show. Admin-only layout pieces go under `src/components/layout/AdminShell/`. | F6, R13, R21, R25, R28, R39, R71 |
| W13 | **The weekly chart is a hand-drawn SVG, with no chart library.** `WeeklySignupsChart` (`src/components/domain/`) draws the 12 × 2 grouped bars of the chart card `izEoo` in `En3Ju` from `weeklySignups`. It has a y axis rounded up to 4 ticks, dd/MM labels from `weekStart` (a business date, formatted with `timeZone: "UTC"`) and the two token colors of the frame legend. It is `role="img"` with an `aria-label` summary, plus a visually hidden table of the 24 values. No dependency is added, so nothing reaches the trainer bundles. | F7, R21, A2 |
| W14 | **One cursor-paging hook for every admin table, with no page numbers or totals.** The BFF pages by `limit` ∈ {10, 25, 50} and `cursor` / `nextCursor`, with no totals (BFF B12). `src/lib/hooks/useCursorPages.ts` keeps a stack of cursors (page 1 has none), with `next()`, `prev()`, `setPageSize()`, and a reset whenever the filters or the size change. Its state logic is a pure reducer in `src/lib/cursorPages.ts`, unit-tested. `Pagination` shows the "Linhas por página" select, previous and next, and the rows on screen ("11–20"), not the frame's page numbers or "de 148". Filters live in the URL (`router.replace`), and the cursor stack stays in component state. | F8, R25, R28, R71 |
| W15 | **Admin wrappers and form rules.** `src/lib/api/adminAuth.ts` holds the sign-in calls, through `authRequest` like the trainer login, so a 401 there is a form error, not a sign-out. `src/lib/api/admin.ts` holds the reads (VRT-26), `adminAccount.ts` the account writes (VRT-29) and `adminCatalog.ts` the catalog (VRT-32), all over `apiClient` and typed from the generated `schema.ts`, with named aliases in `types.ts`. `src/lib/validation/admin.ts` holds `adminReasonSchema` (trimmed, 1–`REASON_MAX` = 500 UTF-16 units), `secondFactorCodeSchema` (`^[0-9]{6}$`), `muscleGroupNameSchema` (trimmed, 1–`MUSCLE_GROUP_NAME_MAX` = 50) and the directory search bound (`ADMIN_SEARCH_MAX` = 100). The new bounds go in `bounds.ts`. The exercise form reuses `src/lib/validation/exercises.ts`. | F8, R39, R52, R53, R61 |
| W16 | **Admin query keys start with `["admin", ...]` and invalidate per resource, never by the bare prefix.** The profile key is `["admin", "profile", id]`. `GET /admin/users/:id` writes a `VIEW_USER_PROFILE` history entry on every call (BFF B13), so that query is fetched once per opening of the page (`gcTime: 0`), and never again on focus, reconnect, interval or retry (`staleTime: Infinity`, `refetchOnWindowFocus: false`, `refetchOnReconnect: false`, `retry: false`). The only refetch is an explicit one after a write that changes the profile (§9). Invalidating `["admin"]` as a whole would refetch an open profile, so the rule is "name the resource". The table is in §9. | F13, R67, E38 |
| W17 | **Trainer muscle-group queries get a finite `staleTime`.** Once admins add and rename groups (R61, R62), the `staleTime: Infinity` in `ExerciciosContent.tsx`, `AddExerciseDialog.tsx` and `ExerciseDialog.tsx` becomes `MUSCLE_GROUPS_STALE_TIME` = 5 minutes, exported from `src/lib/api/muscleGroups.ts`, whose "changes rarely" comment is rewritten. It ships in VRT-32, when renames go live. | F13, R62, E35 |
| W18 | **The roster's "Suspenso" badge and the history labels.** `AlunosContent.tsx` shows `Badge variant="danger"` "Suspenso" when `ClientSummary.suspended` is true (VRT-29, after BFF VRT-28's types). History action labels are one map keyed by the contract's `AdminAction` union (§6), so a new action fails typecheck instead of rendering a raw code. | F10, F15, R46, R71, E22 |
| W19 | **Frame elements the contract doesn't carry are left out, not invented.** The approved frames show a few numbers and fields that no BFF route returns. The screens leave them out rather than compute them on the client or make extra calls. The list is in §7.1. Each is a display detail, with no rule behind it, and none needs a new route. | F5 |
| W20 | **The admin's own password change (R16a, E42) ships in VRT-25** (owner's decision, 2026-11-18, on the ticket): no new frame; it reuses the trainer's change-password pattern (vertice-mobile's screen: current, new, confirm; a wrong current password is a field error) as `ChangePasswordDialog`, reached from "Alterar senha" in `SideNav`'s account block, and calls `POST /auth/password` (allow-listed, W5). Afterwards every session has ended, so the shell signs out to `/painel/entrar?motivo=senha-alterada`, which reads "Senha alterada. Entre com a nova senha.", and the admin signs in again with the new password and the code. **Deferred, with reason:** an admin terms-consent gate (`POST /auth/me/consent` is allow-listed for parity with BFF B7, but the panel has no consent screen), and the CloudWatch alarm and DNS (VRT-19). | Design gate (CLAUDE.md) |

## 1. Hosts and the page routing table

`proxy(request)` first computes `workspaceOf(request.headers)`, then applies that workspace's own
table. The CSP rendering (`renderWithCsp`) is unchanged and applies to every page that renders.

**Trainer host (www, and any host that isn't `ADMIN_HOST`)**: today's table, plus one rule:
`/painel` and `/painel/**` → 404. `/healthz` and `/baixar-app` pass as today.

**Admin host**

| Path | No admin cookie | Admin cookie present |
|---|---|---|
| `/` | redirect `/painel/entrar` | redirect `/painel` |
| `/painel/entrar` | render | render (never redirected away, so a stale cookie can't loop; a fresh sign-in overwrites it) |
| `/painel`, `/painel/**` | redirect `/painel/entrar?redirect=<path>` (`safeRedirectPath`, further limited to `/painel` paths) | render; the layout decides the role (W4) |
| `/healthz`, `/icon.png` (and any later metadata route), `/_next/**`, `/__nextjs*` | pass | pass |
| anything else (`/login`, `/dashboard`, `/alunos`, `/termos`, `/definir-senha`, `/baixar-app`, …) | 404 | 404 |

The proxy checks only that the cookie exists. The `(admin)` layout's server-side `GET /auth/me`
is the authority (W4).

**Route groups**
- `src/app/(admin-auth)/layout.tsx` and `painel/entrar/page.tsx` (+ `AdminLoginContent.tsx`).
- `src/app/(admin)/layout.tsx` (W4, with its `AdminUnavailable` state), `painel/page.tsx` (dashboard),
  `painel/usuarios/page.tsx`, `painel/usuarios/[id]/page.tsx`, `painel/exercicios/page.tsx`,
  `painel/historico/page.tsx`. Each page follows the house pattern: a server page that reads
  `params`/`searchParams` and hands off to a `"use client"` `*Content.tsx`.

## 2. Route handlers and the BFF proxy

All new handlers use `hostGuard` (W3), then `guardApiRequest`, `bffHeaders` and
`relayBffResponse`, and are wrapped in `withNoStore`. None logs a body, code, challenge, URI or
token.

| Handler (admin host only) | Body in | BFF call | On success | On failure |
|---|---|---|---|---|
| `POST /api/admin/auth/login` | `{email, password}` (`loginRequestSchema` without `remember`) | `POST /admin/auth/login` | set the challenge cookie; `200 {secondFactor, challengeExpiresAt, challengeExpiresIn}` (seconds left by this server's clock; the browser counts its deadline from receipt, so a skewed computer clock can't misjudge the expiry) | relay (401, 403 `ACCOUNT_SUSPENDED`, 429 + `Retry-After`) |
| `POST /api/admin/auth/enroll` | none | `POST /admin/auth/enroll` `{challenge}` from the cookie | `200 {provisioningUri}` (`no-store`) | no cookie → local 401 `CHALLENGE_INVALID`, no BFF call; 401 → clear the challenge, relay; 409/429 relay |
| `POST /api/admin/auth/verify` | `{code}` (`secondFactorCodeSchema`; anything else 400, no BFF call) | `POST /admin/auth/verify` `{challenge, code}` | set the session cookie, clear the challenge; `200 {user, expiresAt, sessionEndsAt}` | no cookie → local 401 `CHALLENGE_INVALID`; 400 `INVALID_SECOND_FACTOR_CODE` relay (challenge kept); 401 / 409 → clear the challenge, relay; 429 relay |
| `POST /api/admin/auth/renew` | none | `POST /admin/auth/renew` with the session as bearer, only when `iat` is at least 120 s old | `200 {expiresAt, sessionEndsAt}` and a new cookie; or `200 {renewed: false, expiresAt, sessionEndsAt}` (the current cookie's times) with no BFF call when too recent | no cookie, or `now ≥ exp` → clear, 401 with no BFF call; BFF 401 or 403 (not an ADMIN token) → clear, 401; 429 relay (cookie kept) |
| `GET /api/admin/auth/session` | none | none | `200 {expiresAt, sessionEndsAt}` from `adminTokenTimes()` of the current cookie (a status read, not a renewal: it never extends anything) | no cookie, or `now ≥ exp` → 401 |
| `POST /api/admin/auth/logout` | none | none (tokens are stateless) | clear the session and challenge cookies; `200 {ok: true}` | none |

**`/api/bff/[...path]`** (both hosts): after `bffProxyPath`, `bffPathAllowed(workspace,
request.method, upstream)` (W5) → `404 NOT_FOUND` if refused; then the token comes from
`getSessionToken()` on www or `getAdminSessionToken()` on admin; no token → 401 as today.

**www `/api/auth/login`** (W11): after a non-OK BFF answer, a 403 whose `error.code` is
`ADMIN_LOGIN_ELSEWHERE` → the web's 403 `TRAINERS_ONLY` with `APP_ONLY_MESSAGE`, the BFF body
dropped; everything else is relayed as today, `ACCOUNT_SUSPENDED` included. The role check after a
200 stays, for an older BFF (before VRT-28) or a rollback.

**www `/api/auth/password/setup`** is unchanged. `SetPasswordForm`'s success screen gets an
`ADMIN` branch, built in VRT-25 because the BFF ops scripts send admins this www link (BFF §2.1):
"Pronto! Agora entre no painel administrativo com seu e-mail e a nova senha." with a button to the admin
login. `env.server.ts` derives `adminOrigin`: `https://<ADMIN_HOST>` in production; outside
production, the request's own scheme and port with `ADMIN_HOST` as the hostname
(`http://admin.localhost:5173`). The server page passes it in, since the browser never reads env.
With `ADMIN_HOST` unset in production there is no admin origin, so the screen shows the message
without a button rather than a broken link. The screen keeps the layout of the trainer's success state, with no new frame. Without
this branch an admin would be told to use the mobile app.

## 3. Cookies and token times

`src/lib/adminSession.ts` (server-only):
- `setAdminSession(token, expiresAt)`, `getAdminSessionToken()` and `clearAdminSession()`;
- `setAdminChallenge(challenge, expiresAt)`, `getAdminChallenge()` and `clearAdminChallenge()`;
- `adminTokenTimes(token) → {issuedAt, expiresAt, sessionEndsAt} | null`, decoded from the JWT
  payload without verification (`iat`, `exp`, `auth_time + 43200`). It is used only to schedule
  renewal and sign-out, never to decide access.

Both cookie names and attributes are in W6. Nothing sets a `Domain` attribute anywhere, so
`vertice_session` (www) and the admin cookies never reach the other host.

## 4. The sign-in flow (`/painel/entrar`)

`src/lib/adminAuth/signIn.ts` is a pure reducer, unit-tested, consumed by `AdminLoginContent`:

```
password ──login 200, ENROLLED──────────────▶ code ──verify 200──▶ hard navigation to `redirect` or /painel
   │      ──login 200, NOT_ENROLLED──▶ enroll ──verify 200──┘
   │                                  │  enroll 409 (already enrolled) ──▶ code
   ◀── CHALLENGE_INVALID, verify 409, challenge expired at submit, "Voltar para o login": restart, expiry notice
```

| State | Frame | What it shows |
|---|---|---|
| password | `xtHYu`, error `KV3fb` | e-mail, password, "Entrar". The 401 text is "E-mail ou senha inválidos", the 403 text R41's, the 429 text `rateLimitedMessage`. With `?motivo=expirou` or after a restart: the `cb0r1` notice "Sua sessão expirou. Entre novamente." and its footnote. |
| enroll | `Cv0BV`, error `p5TLVn` | The QR drawn **in-process** from `provisioningUri` with the existing `qrcode` dependency (as `AppDownload` does, a `data:` image the CSP's `img-src` already admits). Below it, the `secret` parameter of the URI in groups of 4 ("Não consegue escanear? Digite a chave:"), then `CodeInput` and "Ativar e entrar". The URI is kept only in component state: never in storage, a URL, a log or a third-party service (BFF B14). Enroll is called only from an event, never from an effect: once from the login-200 handler when `NOT_ENROLLED`, or from a "Gerar novo QR" link. Each call carries a request id, and only the latest response is rendered. A StrictMode double effect or an out-of-order answer would otherwise show a secret that has already been replaced (each call mints a new one, B14) and spend the `admin-enroll` bucket. |
| code | `duiOr`, error `q9XrXD` | `CodeInput` (one `<input inputMode="numeric" autoComplete="one-time-code">` drawn as six cells, so paste and OTP autofill work; it keeps the first six digits of what is typed or pasted, with no `maxLength`, which would cut a pasted "123 456" before the space is dropped), "Verificar", "Voltar para o login" (posts `/api/admin/auth/logout`, then restarts). No auto-submit, so a sixth digit can't double-post. |

One request per submit (a submitting ref, as `ConfirmDialog` does). On 429 the submit stays
disabled until the `Retry-After` seconds have passed: a UI wait, not a session timer.

## 5. Renewal and expiry (`AdminShell`)

The layout passes `me` and `adminTokenTimes()` to `AdminShell` as props. `useAdminSession` in
`src/components/layout/AdminShell/` does three things:
- **Renewal on interaction (W8).** Listeners for `pointerdown` and `keydown` (capture, on
  `document`), a `usePathname()` change, and `queryClient.getMutationCache()` "added" events. Each
  counts only when `document.visibilityState === "visible"` and at least 60 s have passed since the
  last attempt from this tab. It posts `/api/admin/auth/renew` with a plain `fetch` (not
  `apiClient`). Every 200 (renewed or not) re-arms the sign-out timer from the times it carries; a 401 calls
  `signOutAdmin("expirou")`. After a renewal the tab posts the new times on a
  `BroadcastChannel("vertice-admin-session")`, and the other tabs re-arm from them.
- **Sign-out timer.** A single timeout at `min(expiresAt, sessionEndsAt) + 1 s`, and a check on
  `visibilitychange`. Either one first reads `GET /api/admin/auth/session`. A later `expiresAt`
  re-arms the timer (another tab renewed); a 401 or a past `expiresAt` calls
  `signOutAdmin("expirou")`. It never posts renew.
- **`signOutAdmin(reason?)`** posts `/api/admin/auth/logout`, then
  `window.location.href = "/painel/entrar" + (reason ? "?motivo=expirou" : "")`. The hard
  navigation also drops the query cache. "Sair" in `SideNav` calls it with no reason.

The throttle arithmetic, the "never from a timer" rule and the cap live in
`src/lib/adminAuth/renewal.ts`: pure functions with an injectable `now`, unit-tested with fake
timers.

## 6. Errors and copy

| Where | Code / status | Copy |
|---|---|---|
| admin password step | 401 `UNAUTHORIZED` | "E-mail ou senha inválidos" |
| both logins | 403 `ACCOUNT_SUSPENDED` | "Sua conta está suspensa. Entre em contato com o suporte." |
| www login | 403 `ADMIN_LOGIN_ELSEWHERE` → web `TRAINERS_ONLY` | `APP_ONLY_MESSAGE` (today's) |
| code / enroll step | 400 `INVALID_SECOND_FACTOR_CODE` | "Código inválido" |
| enroll / verify | 401 `CHALLENGE_INVALID`, verify 409 | back to password with the expiry notice |
| any sign-in step, e-mail actions | 429 `RATE_LIMITED` | `rateLimitedMessage(retryAfter)` |
| any admin page | 401 (`UNAUTHORIZED` or `UNAUTHENTICATED`) | sign out → "Sua sessão expirou. Entre novamente." |
| suspend / reactivate | 409 `PRECONDITION_FAILED` | close the dialog, refetch the profile, toast "O status desta conta já tinha mudado." |
| e-mail actions | 409 `PRECONDITION_FAILED` | toast "O envio de e-mails está indisponível no momento." |
| e-mail actions | 503 `UPSTREAM_UNAVAILABLE` | toast "Não foi possível enviar o e-mail. Tente novamente." (`bHWbL`) |
| end relationship | 404 / 403 | toast "Este vínculo já foi encerrado.", refetch the profile |
| exercise / promote / muscle group | 409 `NAME_TAKEN` | field error "Já existe um exercício com esse nome" (`a5D2r`), or "Já existe um grupo com esse nome" |
| delete starter exercise | 409 `EXERCISE_IN_USE` | banner "Este exercício está em uso e não pode ser excluído" + "\"<nome>\" é usado em treinos. Você ainda pode editá-lo." (`LWZZa`, without the count) |
| profile / ids | 404 `NOT_FOUND` | `useRedirectOnError` back to `/painel/usuarios` |

`NAME_TAKEN` and `EXERCISE_IN_USE` go into `errorMessages` when VRT-32 takes their types.
`CHALLENGE_INVALID` and `INVALID_SECOND_FACTOR_CODE` arrive with BFF VRT-23's types, which VRT-25
pins.

**History labels** (`src/lib/admin/actions.ts`, `Record<AdminAction, string>`):
| Action | Label |
|---|---|
| `VIEW_USER_PROFILE` | "Abriu perfil" |
| `SUSPEND_USER` | "Suspendeu usuário" |
| `REACTIVATE_USER` | "Reativou usuário" |
| `SEND_FIRST_ACCESS_EMAIL` | "E-mail de primeiro acesso" |
| `SEND_PASSWORD_RESET_EMAIL` | "E-mail de redefinição de senha" |
| `END_RELATIONSHIP` | "Encerrou vínculo" |
| `CHANGE_OWN_PASSWORD` | "Alterou a própria senha" |
| `CREATE_STARTER_EXERCISE` | "Criou exercício" |
| `UPDATE_STARTER_EXERCISE` | "Editou exercício" |
| `DELETE_STARTER_EXERCISE` | "Excluiu exercício" |
| `PROMOTE_EXERCISE` | "Promoveu exercício" |
| `CREATE_MUSCLE_GROUP` | "Criou grupo muscular" |
| `RENAME_MUSCLE_GROUP` | "Renomeou grupo muscular" |

The detail column shows:
- the `reason` for a suspension or reactivation;
- "Vínculo com <relatedUser> encerrado." for an ended relationship;
- "\"<subjectLabel>\" copiado para o catálogo inicial." for a promotion;
- "\"<subjectLabel>\"" for the other catalog actions;
- "—" otherwise.

A deleted user reads "Usuário removido", as the BFF sends it (R72).

## 7. Screens

Dates: `createdAt`, `suspendedAt`, `startedAt`/`endedAt` and history `createdAt` are instants
(`formatDateTime` / `formatDateShort` in `BUSINESS_TIME_ZONE`). `lastActiveOn` and `weekStart` are
business dates (`formatDateShort`, and a new `formatDayMonth` for the chart, both on UTC civil
dates). "Hoje" when `lastActiveOn === todayLocalIso()`. Every screen has the loading, empty and
error states its frames show, and a phone layout (R13; `qzCk9`, `fXng6`, `jJXT5`).

| Route | Frames | Data | Notes |
|---|---|---|---|
| shell | `izLYp`, `jJXT5` | `me` from the layout | `SideNav`: Dashboard, Usuários, Histórico, and Exercícios from VRT-32; name and e-mail; "Sair". Below `md` it collapses to a top bar with a menu. |
| `/painel` | `En3Ju`, `rNMsp`, `lSQne`, `qzCk9` | `GET /admin/dashboard` | `MetricCard` × 4: totals, active 7/30 d (sum + split), completed workouts 7/30 d. `WeeklySignupsChart`. "atualizado às HH:MM" from `dataUpdatedAt`. The most-used table (`GET /admin/exercises/most-used`, group filter, paging, "Promover ao catálogo") arrives in VRT-32 (BFF B16). |
| `/painel/usuarios` | `ETgH1`, `i6hSFx`, `BVZe4`, `fXng6` | `GET /admin/users` | Search (`useDebouncedValue`, trimmed, ≤ 100), Papel and Status `Dropdown`s, columns per frame, "Sem treinador" (E15), "N alunos", "Ver perfil". Empty: "Nenhum usuário encontrado para \"<q>\"" + "Limpar filtros". |
| `/painel/usuarios/[id]` | `M3SiW`, `fp164`, `eUOyS`, `d4tAve` | `GET /admin/users/:id` (W16) | Read-only data (no edit controls, R38, E16). Masked CPF as sent. Trainer: CREF, shared WhatsApp/Instagram only when not null, current/former clients (the list is complete; "Ver todos os N alunos" expands it locally), counts. Client: current and past trainers, counts. Each person links to their profile (R37). Suspended: the `d4tAve` banner, from the newest `SUSPEND_USER` entry of `GET /admin/actions?targetUserId=<id>&action=SUSPEND_USER&limit=10` (date, admin, reason), falling back to `suspendedAt` alone. "Toda ação fica registrada no Histórico." links "Histórico" to `/painel/historico?usuario=<id>`. Actions from VRT-29. |
| dialogs (VRT-29) | `oY0tG`, `mS7wU`, `HCHVB`, `GOUMA`, `x81nY`, `bHWbL` | `POST …/suspend`, `…/reactivate`, `…/first-access-email` (clients only), `…/password-reset-email`, `DELETE /admin/relationships/:trainerId/:clientId` (both ids from the profile, BFF B17) | Suspend and reactivate: `TextArea` "Motivo *", confirm disabled until the trimmed reason is non-empty (E20). End relationship: `ConfirmDialog` with no reason. E-mails: no confirm, one request per click, a toast with the user's e-mail on success (R49: nothing else). |
| `/painel/exercicios` (VRT-32) | `c53jx`, `LWZZa`, `iiou2`, `D2koD`, `Ef6Bz`, `a5D2r`, `I6NIe` | `GET /admin/exercises?scope=STARTER\|PRIVATE`, `GET /muscle-groups`, the writes of BFF §2.4 | Tabs "Catálogo inicial" and "Exercícios dos treinadores" (`?aba=treinadores`). Private rows have only "Promover ao catálogo" (R57, E30). The promote dialog is prefilled from the row. The "Grupos musculares" dialog adds and renames, with no remove (R63). Exercise update is a `PUT` of the whole form (BFF B18). |
| `/painel/historico` | `TExWT`, `ZCKW9` | `GET /admin/actions`, `GET /admin/actions/admins` | Filters: Admin (`Dropdown` from the admins list), Ação (the label map), affected user (a removable chip set by `?usuario=<id>`, named from the first entry's `targetUser`). Newest first. Empty: "Nenhuma ação encontrada" + "Limpar filtros". |

### 7.1 Left out of the frames (W19)

| Frame | Element | Why it is left out |
|---|---|---|
| `En3Ju` | "+6 nos últimos 7 dias", "+8.2% vs last week" | No such field in `AdminDashboard` (the second is also English copy) |
| `ETgH1`, `c53jx`, `iiou2`, `TExWT` | Page numbers "1 2 3 … 15", "de 148" | Cursor paging has no totals (W14) |
| `c53jx`, `iiou2` | Tab counts "148" / "57", the "USADO EM" column | `AdminCatalogExercise` has no counts; the most-used list on the dashboard has them |
| `LWZZa` | "aparece em 412 treinos" | `EXERCISE_IN_USE` carries no count |
| `D2koD` | "18 exercícios" per group | `MuscleGroup` is `{id, name}` |
| `M3SiW`, `eUOyS` | "Telefone"; the time in "Hoje, 07:40" | Not in `AdminUserProfile`; `lastActiveOn` is a date |
| `TExWT` | "Buscar por nome ou e-mail" on the affected user; "old → new" on a rename | `ListActions` filters by `targetUserId` only; history keeps one label snapshot |

## 8. Components

| Component | Folder | Source frame | Stories |
|---|---|---|---|
| `SideNav` | `ui/` | `izLYp`, `jJXT5` | each active item, collapsed phone menu, open menu |
| `Toast` (+ `ToastProvider` in `AdminShell`) | `ui/` | `jjLsR`, `bHWbL` | success, error; `aria-live="polite"`, auto-dismiss 5 s |
| `Pagination` | `ui/` | `a8AGY` | first page, middle, last page, page-size open |
| `DataTable` | `ui/` | `ETgH1`, `c53jx`, `TExWT` table cards | loaded, loading (`TableRowSkeleton`), empty slot, phone stacking |
| `TextArea` | `ui/` | `oY0tG`, `mS7wU` | empty, filled, error, disabled |
| `CodeInput` | `ui/` | `Cv0BV`, `p5TLVn`, `duiOr`, `q9XrXD` | empty, partial, full, error |
| `AdminShell` | `layout/` | `izLYp` + page frames | desktop, phone |
| `WeeklySignupsChart` | `domain/` | `izEoo` in `En3Ju` | 12 weeks, all zeros, one dominant week |
| `SuspendDialog` / `ReactivateDialog`, `AdminExerciseDialog` (create, edit and the prefilled promote copy, one form), `MuscleGroupsDialog`, `PromoteExerciseButton` | `domain/` | §7 frames | disabled-until-reason, filled, `NAME_TAKEN`, prefilled promote |

Kit components are generated or synced from the `.pen` through the `pencil` MCP tools and checked
with `pencil-design-audit` before their ticket merges (CLAUDE.md). `Badge` is reused for Admin
Badge (W12). The design file is read, never edited, by the implementation tickets.

## 9. Data fetching

| Query key | Route | Options |
|---|---|---|
| `["admin", "dashboard"]` | `GET /admin/dashboard` | defaults (30 s) |
| `["admin", "users", {role, status, q, limit, cursor}]` | `GET /admin/users` | `placeholderData: keepPreviousData` |
| `["admin", "profile", id]` | `GET /admin/users/:id` | W16: `gcTime: 0`, `staleTime: Infinity`, no focus or reconnect refetch, `retry: false` |
| `["admin", "actions", filters]` | `GET /admin/actions` | defaults |
| `["admin", "actions", "suspension", id]` | `GET /admin/actions?targetUserId&action=SUSPEND_USER` | enabled only while `suspended` |
| `["admin", "action-admins"]` | `GET /admin/actions/admins` | `staleTime` 5 min |
| `["admin", "exercises", filters]` / `["admin", "exercises", "most-used", filters]` | catalog lists | defaults |
| `["admin", "muscle-groups"]` | `GET /muscle-groups` | `MUSCLE_GROUPS_STALE_TIME` |

| Write | Invalidates | Profile |
|---|---|---|
| suspend / reactivate | `["admin", "users"]`, `["admin", "actions"]` | one explicit `refetch()` (one more history entry, truthful: the admin is looking at it) |
| first-access / reset e-mail | `["admin", "actions"]` | none |
| end relationship | `["admin", "users"]`, `["admin", "actions"]` | one explicit `refetch()` |
| create / update / delete / promote exercise | `["admin", "exercises"]`, `["admin", "actions"]` | none |
| create / rename muscle group | `["admin", "muscle-groups"]`, `["admin", "exercises"]`, `["admin", "actions"]` | none |

No admin query polls (`refetchInterval` is never set), and no query or refetch counts as an
interaction for renewal (W8).

## 10. Tests

**Unit (`unit` project)**
- `src/proxy.test.ts` becomes a host × path × cookie matrix. Hosts: `www.vertice.fit`,
  `admin.vertice.fit`, `ADMIN.vertice.fit:443`, `localhost:3000`, an unknown host; and
  `ADMIN_HOST` unset in production. Paths: `/`, `/login`, `/dashboard`, `/alunos/1`, `/termos`,
  `/definir-senha`, `/baixar-app`, `/healthz`, `/icon.png`, `/_next/webpack-hmr`, `/painel`,
  `/painel/entrar`, `/painel/usuarios/1`. Cookies: none, `vertice_session`, the admin cookie. Expected: §1's tables
  (each 404 checked as a 404, not a redirect), and a trainer cookie on the admin host counted as
  no cookie.
- `src/lib/host.test.ts`: hostname parsing (case, port, IPv6 literal, missing `Host`),
  `X-Forwarded-Host` ignored, and the `hostGuard` 404.
- A source-scan test: every `src/app/api/**/route.ts` calls `hostGuard`, and each handler's
  workspace matches W3's list.
- `src/lib/bffAllowList.test.ts`: every W5 entry allowed, with the method mattering
  (`DELETE /auth/me`, `PATCH /auth/me`, `GET /auth/me/export`, `GET /exercises`, `/admin/auth/*`
  refused on admin; `/admin`, `/admin/users` refused on www).
- `/api/bff/[...path]/route.test.ts`: each host reads only its own cookie, and a refused path makes
  no `fetch`.
- `/api/admin/auth/*` route tests (mocked `fetch` and `@/lib/adminSession`):
  - the challenge never appears in a response body;
  - the cookie attributes and `maxAge` are the W6 ones;
  - every row of §2;
  - renew makes no BFF call under 120 s or past `exp`, and its `{renewed: false}` carries the current times;
  - session answers the cookie's times, never calls the BFF and never sets a cookie;
  - logout clears both cookies;
  - each handler answers 404 on www.
- `/api/auth/login/route.test.ts`: 403 `ADMIN_LOGIN_ELSEWHERE` → 403 `TRAINERS_ONLY`; 403
  `ACCOUNT_SUSPENDED` relayed; a wrong password still 401; 404 on the admin host.
- `src/lib/api/client.test.ts`: a 401 on `/painel/x` posts the admin logout and lands on
  `/painel/entrar?motivo=expirou`; a 401 elsewhere keeps today's path.
- `signIn.test.ts` (each transition of §4, and an out-of-order enroll response ignored), `renewal.test.ts` (no renewal without an interaction,
  60 s per tab, never past `sessionEndsAt`, the sign-out time, and a tab with a stale timer whose
  session read shows a cookie renewed by another tab re-arms instead of signing out), `cursorPages.test.ts`, the
  `admin.ts` validation schemas (reason blank, 500 and 501 UTF-16 units; codes `12345`,
  `1234567`, `12a456`), `actions.ts` exhaustiveness (`contract.test.ts` gains `AdminAction`), and
  `format.test.ts` for `formatDayMonth` under `test:hostile-tz`.

**Stories (`storybook` project):** every §8 component; each admin `*Content` in loaded, loading,
empty and error states (fixtures in `storyFixtures.ts`, queries through `storyQuery.tsx`); the
sign-in states of §4; the suspended profile banner; the roster's "Suspenso" badge; `LoginForm`
with the suspended message.

**Manual, per slice (a production build, `npm run build && npm run start`, and the dev server, both hosts):** run `npm run dev` and open
`http://admin.localhost:5173`, which Chrome and Firefox resolve to loopback. Check:
- E1, E3–E6 and E8–E9 end to end;
- idle sign-out at 30 minutes, with a shortened BFF TTL in local only;
- a phone-width pass.

## 11. Slices and tickets

| Ticket | Needs (deployed) | Scope |
|---|---|---|
| **VRT-25** Admin host, routing and sign-in | BFF VRT-23 (`.bff-ref` at its merge commit); its **first PR** needs nothing (W11) | PR 1: W11 (www login maps `ADMIN_LOGIN_ELSEWHERE`, both logins show `ACCOUNT_SUSPENDED`, local constants, tests). Then: `ADMIN_HOST` env + `.aws/task-definition.json` (`ADMIN_HOST=admin.vertice.fit`); `host.ts`, `hostGuard` on every handler, the proxy tables (W1–W3); the BFF allow-list and per-host cookie (W5); `adminSession.ts` (W6); the six `/api/admin/auth/*` handlers; `/painel/entrar` with `CodeInput` and the in-process QR (W7, W10); the `(admin)` layout check with `AdminUnavailable`, the trainer layout check (W4); `AdminShell` with `SideNav`, `Toast`, renewal and the sign-out timer (W8); host-aware `failure()` (W9); the setup success screen's ADMIN branch (§2); README "Deployment" (the admin host, `ADMIN_HOST`) and CLAUDE.md (two workspaces, the cookies, the guard rule). The dashboard route renders an empty shell until VRT-26. |
| **VRT-26** Dashboard, users, profiles, history | BFF VRT-24; VRT-25 | `admin.ts` wrappers and type aliases; `useCursorPages`, `Pagination`, `DataTable`; `/painel` (without most-used), `WeeklySignupsChart`; `/painel/usuarios`; `/painel/usuarios/[id]` read-only, with W16's query options and the suspended banner; `/painel/historico` with the label map (W18). |
| **VRT-29** Suspension, e-mail actions, login messages | BFF VRT-28 (and the VRT-25 build already live, see Merge and deploy order) | `.bff-ref` at VRT-28; `adminAccount.ts`; `TextArea`; the suspend, reactivate and end-relationship dialogs; the e-mail actions with toasts; §9 invalidation; the roster badge (W18); move `ACCOUNT_SUSPENDED` into `errorMessages` and key `LoginForm` and the admin login on the generated code, dropping the local constants where the type now exists (keep `ADMIN_LOGIN_ELSEWHERE_CODE`'s mapping in the route). |
| **VRT-32** Exercise curation screens | BFF VRT-31 | `.bff-ref` at VRT-31; `adminCatalog.ts`; `/painel/exercicios` (both tabs, form, promote, muscle-groups dialog); the dashboard's most-used table with group filter and promote; `NAME_TAKEN` / `EXERCISE_IN_USE` copy; "Exercícios" in `SideNav`; trainer `MUSCLE_GROUPS_STALE_TIME` (W17). |

## Merge and deploy order

Every merge to `main` deploys (CD). The default holds: vertice-api → vertice-bff →
vertice-web-react within each slice, and a web ticket merges only after its BFF ticket is
deployed and `.bff-ref` points at that BFF merge. One deviation: W11.

1. **Infra VRT-19** (§12): the CNAME and the CloudFront alias can land any time. The ALB host rule
   lands **last, after VRT-25 (with `ADMIN_HOST`) is deployed**, so the admin hostname answers 403
   until then and never serves the trainer workspace. Admin code is inert until `ADMIN_HOST` is set
   (W1), so VRT-25 can merge before VRT-19 starts. The trainer host is unaffected either way.
2. **VRT-25 PR 1 (W11), before BFF VRT-28 deploys.** The web's login route relays any non-OK BFF
   answer, so if the BFF answered `ADMIN_LOGIN_ELSEWHERE` first, www would show a generic error to
   an admin and break R3/E2. PR 1 has no dependency (route-local constants, no new route), so it
   should merge first and early. VRT-28 in vertice-bff is blocked by it being deployed.
3. **API VRT-20 → VRT-21 → VRT-22, then BFF VRT-23 → VRT-24** (API §7, BFF §6), then **web VRT-25**
   (the rest) and **VRT-26**. Against an older BFF, every `/admin/*` call is a 404 from the BFF, so
   the order matters.
4. **Slice 2:** API VRT-27 → BFF VRT-28 (only with step 2 live) → **web VRT-29**. Until VRT-29 the
   roster has no badge and the suspended message comes from W11's constants, which is already
   correct.
5. **Slice 3:** API VRT-30 → BFF VRT-31 → **web VRT-32**.

**Rollback** goes in reverse order, web first: the previous task definition.
- Before rolling back VRT-25 (the rest), delete the ALB's admin-host rule (priority 6) first;
  otherwise the old build serves the trainer workspace on the admin hostname.
- **Never roll the web back past VRT-25 PR 1 while BFF VRT-28 is live.** Roll BFF VRT-28 back
  first: it restores the 200 that the web's role check refuses (R3 holds).
- VRT-26, VRT-29 and VRT-32 roll back alone. The BFF routes they use stay, unused.

## 12. What infra VRT-19 needs from the web

- **DNS and certificate:** a Hostinger CNAME `admin` → the web distribution
  `d3h3s9dovm7j87.cloudfront.net`, and `admin.vertice.fit` as an alternate domain name on the web
  distribution `EP28H1IFFHEP9`. The existing us-east-1 ACM certificate already covers
  `*.vertice.fit`. CloudFront reaches the shared ALB over HTTP :80, so no ALB certificate is
  involved.
- **Forward the viewer `Host` unchanged** to the origin on every behaviour that reaches the web:
  the distribution's `AllViewer` origin request policy already does this, on `/_next/static/*` too. W1 decides the workspace from `Host`
  alone, and `requestGuard` already compares `Origin` with `Host`. A rewritten `Host` sends the
  admin to the trainer workspace and refuses POSTs from browsers without `Sec-Fetch-Site`.
- **No caching of pages or `/api/*`.** `CachingDisabled` is set per behaviour, not per host, so
  on the shared distribution it applies to www as well, as the default behaviour already does.
  `_next/static/*` may stay cached. Cookies and query strings are forwarded on those behaviours. `Set-Cookie` is passed
  through untouched: never add a `Domain`, never rewrite cookie names (the `__Host-` prefix needs
  `Secure`, `Path=/` and no `Domain`).
- **ALB (the required change):** a listener rule for host `admin.vertice.fit` plus the
  origin-header check, which forwards to the **web** target group. It is a new rule (priority 6),
  not a sixth value on rule 5: a rule holds at most 5 condition values, a fixed quota, and rule 5
  (four web hosts plus the origin header) is full. Without it the listener's default action answers every admin request with 403. Add it
  **last**, after VRT-25 with `ADMIN_HOST` is deployed: until then the hostname answers 403
  instead of serving the trainer workspace. The chain must stay
  CloudFront → ALB → Next, appending to `X-Forwarded-For`, so `TRUSTED_PROXY_HOPS=2` still holds
  for the BFF's per-IP limits on the admin sign-in buckets.
- **Task definition:** `ADMIN_HOST=admin.vertice.fit` (added by VRT-25 in
  `.aws/task-definition.json`, by PR). No new secret on the web side.
- **The alarm** reads the BFF's `admin.signin` lines (BFF §4). The web logs nothing for it.
- HSTS stays per host (no `includeSubDomains`), as today.

## 13. Out of scope / follow-ups

- An admin terms-consent gate, if the owner wants one (W20).
- Recovery codes (PRD §6), admin features in the mobile app (PRD §6).
- The frame elements of §7.1, if the contract later grows them.
