# Spec (Web): Web Access for Trainers Only

Status: Implemented
Design: design-ok — approved by the owner on 2026-10-24 (pen.dev `Vertice Web.pen`, section
"Web — Acesso só para treinadores" `kfvY1`: frames `q2isIT`, `j2j1L`, `NIGup`, `J9F36n`)
Owner: hebertpdl@gmail.com
Related: [vertice-api PRD](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/web-trainer-only-access/prd.md)
(source; R1–R11, E1–E16), [vertice-api spec](https://github.com/herbertpdl/vertice-api/blob/main/docs/specs/web-trainer-only-access/spec.md),
[vertice-bff spec](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/web-trainer-only-access/spec.md),
`docs/assessments/web-trainer-only-access/assessment.md` (F1–F8)

## 0. Scope decisions

- **The login route refuses a non-trainer before it creates a session (F3; R1, R2, R5).** After a
  2xx from the BFF, a `user.role` other than TRAINER gets the web's own `403 TRAINERS_ONLY` with
  the R3 message. `setSession` is never called, and the BFF token is dropped, not relayed. A wrong
  password is a 401 before any role is known, so R4 and E2 need nothing. The code is web-only (not
  in the BFF contract): `LoginForm` checks it by name.
- **The role gate is `TermsConsentGate` (F1, option D; R6, R7).** Every `(app)` page already loads
  `GET /auth/me` there and fails closed. A non-TRAINER `me` renders nothing (the loading overlay)
  and is signed out once, to `/login?motivo=app`, which shows the R3 message. The role is the
  authoritative one (vertice-api re-reads it per call), there is no extra request, the token is not
  decoded, and the BFF contract is unchanged. `AppHeader` shows the trainer navigation only for a
  trainer `me`, so no trainer link appears while `me` loads (R6, "not even briefly").
- **`/perfil` is a protected prefix (F6).** A signed-out visit now redirects like the other
  `(app)` routes.
- **The success screen follows the setup response (F2; R10, R11).** `POST /auth/password/setup`
  now answers `{role, email}`. A TRAINER keeps today's screen ("Ir para o login"). Any other role
  gets "Pronto! Agora entre no aplicativo Vertice com seu e-mail e a nova senha." and the
  `AppDownload` block, with no web login.
- **Phone or computer is decided once, when the success screen appears (F4; R10a–R10c, E14).**
  `matchMedia("(pointer: coarse)")`: the screen only renders after a submit, never on the server,
  so there is no hydration mismatch and no user-agent parsing. A tablet counts as a phone.
- **"Abrir o app" is `verticemobile://login?email=<encoded>` (F5; R10a, E11, E12).** It uses the
  custom scheme the mobile app declares; universal/app links are a follow-up, since they need a
  published app. Only the email travels, never the setup token. The store links sit directly under
  the button, so the fallback is visible before the tap (on iOS a missing app shows a system
  alert).
- **The QR code encodes this site's `/baixar-app` (F7; R10d, E16).** A small route handler
  redirects an iPhone/iPad to the App Store and Android to Google Play, and gives anything else
  both links on a bare page. One code works for every phone, and the store URLs live in one place
  (`src/lib/appLinks.ts`): placeholders until the app is published (R10e, E15). The QR is rendered
  client-side with the `qrcode` package into a `data:` SVG image (the CSP allows `img-src data:`),
  because its URL depends on the deployment's origin.
- **`zod` bumped to 4.6.7 (lockfile only, still `^4.5.4`).** GHSA-mrhx-c7xc-m3w5 (high) was
  published after `main`'s last CI run and fails `npm audit --audit-level=high` on any PR.

## 1. Changes

- `src/lib/auth/trainerOnly.ts`: `isTrainer`, `TRAINERS_ONLY_CODE`, `APP_ONLY_MESSAGE`,
  `APP_ONLY_LOGIN_PATH`.
- `src/app/api/auth/login/route.ts`: the refusal; `LoginForm`: its message, the `?motivo=app`
  notice, the password cleared on a refusal, and `role="alert"` on the form error.
- `TermsConsentGate`, `AppHeader`, `useSignOut(to = "/login")`, `src/proxy.ts` (`/perfil`).
- `SetPasswordForm` (injectable `device` for stories), `src/lib/api/auth.ts` `setupPassword` typed
  `PasswordSetupResult`, the new domain component `AppDownload`, `src/lib/appLinks.ts`, and
  `src/app/baixar-app/route.ts`.
- `src/lib/api/.bff-ref` → vertice-bff `88e5b71` (#52), `schema.ts` regenerated.
- `vitest.config.mts`: the `unit` project also picks up `src/app/**/route.test.ts`.

## 2. Tests

- `src/app/api/auth/login/route.test.ts`: CLIENT and ADMIN get `403 TRAINERS_ONLY`, no
  `setSession`, and no token in the body. A trainer still gets a session, and a 401 is relayed.
- `src/proxy.test.ts`: `/perfil` redirects when signed out; `/baixar-app` passes either way.
- `src/app/baixar-app/route.test.ts` and `src/lib/appLinks.test.ts`: the store per user agent,
  and the deep link's encoding.
- Stories:
  - `LoginForm` `SentToTheApp`.
  - `TermsConsentGate` `ClientSession` and `AdminSession`: no page, no consent notice, signed out
    to `/login?motivo=app`.
  - `SetPasswordForm` `FromLink` (client on a phone), `ClientOnComputer` and `Trainer`.
  - `AppDownload` `Phone` and `Computer`.

## 3. Merge and deploy order

vertice-api #76 → vertice-bff #52 (both merged) → **vertice-web-react (this change)** and
vertice-mobile (the login reads `email` from the deep link; until it ships, "Abrir o app" opens the
app's login without the email filled in). Rollback: this change alone. The BFF's setup response
stays compatible with the previous web build.
