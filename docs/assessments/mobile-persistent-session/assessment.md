# Technical assessment: Stay logged in on the mobile app (vertice-web-react, regressions only)

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api `docs/prds/mobile-persistent-session/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/mobile-persistent-session/prd.md) (Approved),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/mobile-persistent-session/assessment.md)
Spec: none needed for this repo

## 1. Summary

Overall risk: Low. The web keeps its 8-hour login (R5) and needs no change to keep it: its login
route builds the upstream body explicitly from the generated contract
(`src/app/api/auth/login/route.ts:18-23`), and its BFF calls forward only `X-Forwarded-For` (`src/lib/bff.ts:41-49`), so it will not send the new mobile-client header
(vertice-bff B1) and keeps getting 8h tokens. The web inherits two behavior changes, both
arriving as the 401 the web already handles (`apiClient` logs out and goes to `/login`): a password
change made elsewhere (mobile app or a link) now ends web sessions too (R9/R11), and a role change
ends them (R14). R14 also keeps the web's trainer-only access correct after a role change, since
that rule is checked only at login (`src/app/api/auth/login/route.ts:31`). No Blocker or High
findings.

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R5, E3 | existing: `src/app/api/auth/login/route.ts` | No mobile-client header forwarded → 8h. |
| R9, R11, R14 | existing 401 path (`src/lib/api/client.ts:66-81`) | W1. |
| R12 | existing | Account deletion already ends web sessions. |
| R1–R4, R6–R8, R10, R13, R15–R19, E1, E2, E4–E9 | n/a | Mobile and BFF only. |

## 3. Current state

The web stores the BFF token in the httpOnly `vertice_session` cookie (`src/lib/session.ts`; its
`maxAge` under "remember me" can outlive the 8h token, which then 401s as today). `npm run
api:types -- --check` will fail in CI once the BFF's OpenAPI document declares the mobile-client
header, until `.bff-ref` and `schema.ts` are synced.

## 4. Findings by dimension

### PRD fit

**W1 — Low — a web session ends because of a change made elsewhere, with no explanation.**
- What: the web has no change-password screen (its only password flow is the public
  `/definir-senha`, which holds no session). But when a trainer changes the password in the mobile
  app or through a link (R9/R11), or their role changes (R14), every open web tab gets a 401 on its
  next call and lands on a bare `/login`.
- Where: `failure()` in `src/lib/api/client.ts:66-81` (401 → logout → `/login`).
- Recommendation: accept the bare redirect; the PRD keeps the web unchanged (§1, §6 of the PRD).
  A message would need the BFF to send a distinct error code, since the web cannot tell this 401
  from a normal 8h expiry; if wanted later, reuse the `?aviso=` notice pattern of
  `DeleteAccountDialog` (`/login?aviso=conta-excluida`).

### API contract and backward compatibility

**W2 — Info — contract sync.** The mobile-client header parameter and the renewal route appear in
`schema.ts` after `npm run api:types`; the web must not send the header (it can't today: `bffHeaders` forwards only `X-Forwarded-For`). Nothing else to do.

### Other dimensions

Nothing found. Checked: security (the web gets no long-lived token), data, performance, logging,
rollout (no web deploy needed for the feature itself).

## 6. Testing strategy

Existing route tests for `/api/auth/login` keep asserting the exact upstream body (no mobile
field). The 401 → `/login` path is existing behavior; nothing new to test.

## 7. Rollout

No ordering constraint; sync `.bff-ref` after the BFF change merges.

## 8. Effort and risk

Size XS (contract sync).

## 9. Questions and assumptions

None.

## 10. Inputs to the spec

- [ ] Confirm W1: a session ended by a password or role change elsewhere shows the bare `/login`, as
  an expired one does (a message would need a distinct BFF error code).
