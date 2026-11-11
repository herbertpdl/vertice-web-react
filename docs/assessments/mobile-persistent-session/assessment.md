# Technical assessment: Stay logged in on the mobile app (vertice-web-react, regressions only)

Status: Draft
Owner: hebertpdl@gmail.com
Related: [vertice-api `docs/prds/mobile-persistent-session/prd.md`](https://github.com/herbertpdl/vertice-api/blob/main/docs/prds/mobile-persistent-session/prd.md) (Approved),
[vertice-bff assessment](https://github.com/herbertpdl/vertice-bff/blob/main/docs/assessments/mobile-persistent-session/assessment.md)
Spec: none needed for this repo unless W1 is taken

## 1. Summary

Overall risk: Low. The web keeps its 8-hour login (R5) and needs no change to keep it: its login
route builds the upstream body explicitly from the generated contract
(`src/app/api/auth/login/route.ts:18-23`), and its BFF calls forward only `X-Forwarded-For` (`src/lib/bff.ts:41-49`), so it will not send the new mobile-client header
(vertice-bff B1) and keeps getting 8h tokens. The one behavior change the web inherits is R9: a
password change anywhere now ends web sessions too, which arrives as the 401 the web already
handles (`apiClient` logs out and goes to `/login`). No Blocker or High findings.

## 2. PRD coverage map

| Rule | Lands on | Notes |
|---|---|---|
| R5, E3 | existing: `src/app/api/auth/login/route.ts` | No mobile-client header forwarded → 8h. |
| R9, R11 | existing 401 path (`src/lib/api/client.ts`) | W1. |
| R12 | existing | Account deletion already ends web sessions. |
| R1–R4, R6–R8, R10, R13–R19, E1, E2, E4–E9 | n/a | Mobile and BFF only. |

## 3. Current state

The web stores the BFF token in the httpOnly `vertice_session` cookie (`src/lib/session.ts`; its
`maxAge` under "remember me" can outlive the 8h token, which then 401s as today). `npm run
api:types -- --check` will fail in CI once the BFF's OpenAPI document declares the mobile-client
header, until `.bff-ref` and `schema.ts` are synced.

## 4. Findings by dimension

### PRD fit

**W1 — Low — changing the password on the web logs that browser out.**
- What: R9/R10 void every session, including the browser where the password was changed; the
  web's change-password flow will hit a 401 on its next call.
- Where: the web's change-password screen and `apiClient`'s 401 → `/login`.
- Recommendation: after a successful change, log out and show "Senha alterada. Entre com a nova
  senha." on `/login` instead of a bare redirect. Small; can ride along with the BFF sync.

### API contract and backward compatibility

**W2 — Info — contract sync.** The mobile-client header parameter and the renewal route appear in
`schema.ts` after `npm run api:types`; the web must not send the header (it can't today: `bffHeaders` forwards only `X-Forwarded-For`). Nothing else to do.

### Other dimensions

Nothing found. Checked: security (the web gets no long-lived token), data, performance, logging,
rollout (no web deploy needed for the feature itself).

## 6. Testing strategy

Existing route tests for `/api/auth/login` keep asserting the exact upstream body (no mobile
field). If W1 is taken: a test for the post-change logout and its message.

## 7. Rollout

No ordering constraint; sync `.bff-ref` after the BFF change merges.

## 8. Effort and risk

Size XS (contract sync), S with W1.

## 9. Questions and assumptions

None.

## 10. Inputs to the spec

- [ ] Whether to take W1 (post-password-change message) now or later.
