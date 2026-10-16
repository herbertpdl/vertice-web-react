# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Vertice Web (React) is the browser client for Vertice Coach and the replacement for the
deprecated Vue-based `vertice-web`. It is **not** a skeleton any more: trainer-side product
features are implemented (login/registration, dashboard, students roster and detail with
plans/progress/feedback tabs, exercise catalog, training-plan detail, and a workout editor with
exercises and sets). Client-side screens (do-a-workout session, progress) are not built yet.

## Commands

```bash
npm run dev              # dev server on http://localhost:5173 (scripts/dev-open-browser.mjs wraps `next dev` and opens the browser)
npm run build            # production build
npm run start            # run the production build
npm run lint             # ESLint (flat config, eslint-config-next core-web-vitals + typescript), `--max-warnings 0`: any warning fails it
npm run typecheck        # next typegen (generates LayoutProps/PageProps into .next/types) + tsc --noEmit
npm run test:unit        # vitest `unit` project (node), the fast run
npm run test:hostile-tz  # the `unit` project again in two processes, TZ=Pacific/Kiritimati (UTC+14) and TZ=Pacific/Honolulu (UTC-10): nothing may depend on the host's zone (see "Dates and times")
npm run test:storybook   # vitest `storybook` project: every story as a headless Chromium test (@storybook/addon-vitest + playwright)
npm test                 # both projects
npm run storybook        # Storybook on :6006 (stories live next to each src/components/ui/* component)
npm run api:types        # regenerate src/lib/api/schema.ts from vertice-bff's OpenAPI document (below)
```

CI (`.github/workflows/ci.yml`, on every PR and push to `main`) runs two jobs: `build-and-test`
(`npm ci` → `api:types -- --check` → lint → typecheck → `test:unit` → `test:hostile-tz` → build →
`npm audit --omit=dev --audit-level=high`) and `storybook` (Playwright Chromium, then
`test:storybook`). Run the same commands locally before pushing. The build needs no BFF and no
env.

Read form values with `useWatch({ control, name })`, not `useForm().watch()`: `watch` makes the
React Compiler skip the whole component (`react-hooks/incompatible-library` warning).

The dev server is pinned to port `5173` (not Next's usual `3000`) since `3000` is
`vertice-bff`'s default port and `vertice-bff`'s `CORS_ORIGIN` already defaults to
`http://localhost:5173`. Override with `npm run dev -- -p <port>` if needed.

Besides the Storybook story tests (every `src/**/*.stories.tsx`, per `.storybook/main.ts`),
`vitest.config.mts` has a `unit` project (node environment, `src/lib/**/*.test.ts`,
`src/app/api/**/*.test.ts` and `src/proxy.test.ts`) for pure modules (the workout editor's
autosave engine, validation schemas, `forwardedFor`) and for the route handlers and the proxy,
which tests call directly with a
`NextRequest` (mock `fetch` and `@/lib/session`; `server-only` is aliased to a no-op). Pages
under `src/app/` have no tests.

## Architecture

### Data flow: browser → Next route → BFF

The browser never calls `vertice-bff` directly. `src/lib/api/client.ts` (`apiClient`) fetches
`/api/bff/<path>`, which `src/app/api/bff/[...path]/route.ts` forwards to `${BFF_URL}/api/<path>`
(`src/lib/bff.ts`), attaching the JWT from the httpOnly `vertice_session` cookie
(`src/lib/session.ts`). Login/register/logout have their own routes under `src/app/api/auth/*`
that set/clear that cookie; they parse the body with the Zod schemas in
`src/lib/validation/auth.ts` and build the upstream body explicitly (register hardcodes
`role: "TRAINER"`). `/api/auth/password/setup` redeems a first-access token from the public
`/definir-senha?token=` page. Every BFF call sends `bffHeaders(request, …)`, which adds
`X-Forwarded-For` for the BFF's per-IP rate limits (README, "Deployment"; `TRUSTED_PROXY_HOPS`,
required in production: unset, `src/instrumentation.ts` exits at boot and the call throws);
use it, and `relayBffResponse` (keeps `Retry-After`, `Content-Disposition` on a 2xx for the
`GET /auth/me/export` file name, null body on 204), for any new route.
Every `/api/*` handler starts with `guardApiRequest(request, "json" | "optional-json" | "none")`
(`src/lib/requestGuard.ts`): 403 unless `Sec-Fetch-Site`/`Origin` say same-origin (unsafe methods
must carry `Origin`), 415 for a non-JSON body. The BFF proxy encodes each path segment and 400s
`.`, `..`, empty or slash-carrying ones (`bffProxyPath` in `src/lib/bff.ts`). The session cookie
is `HttpOnly`, `SameSite=Strict`, `Secure` when the server runs with `NODE_ENV=production`.
`src/proxy.ts` is the edge guard: no cookie → `/login?redirect=<path>`, cookie on an auth page →
the `redirect` path or `/dashboard`, `/definir-senha`, `/termos` and `/privacidade` public either
way. Inside `(app)`, `TermsConsentGate` replaces the page with a blocking notice until `GET
/auth/me`'s `consent.termsVersion` equals `LEGAL_VERSIONS.terms` (`src/lib/legal/versions.ts`, the
version of the draft texts this build ships; register sends it as `acceptedTermsVersion`). It fails
closed (no `me` → error state with "Tentar novamente", never the page) and `console.warn`s when the
BFF's `GET /legal/versions` differs from the embedded versions. A `redirect` value only
ever goes through `safeRedirectPath` (`src/lib/safeRedirect.ts`, same-origin paths only), here and
in `LoginForm`. The proxy also sends the page CSP, per request with a nonce
(`src/lib/csp.ts`, `Content-Security-Policy-Report-Only` for now), which is why the root layout
calls `connection()` and every page renders dynamically; the static security headers (HSTS
outside `next dev`, `X-Frame-Options`, `nosniff`, Referrer-/Permissions-Policy) are in
`next.config.ts`. On any 401 `apiClient` logs out server-side and hard-
navigates to `/login` (see the comment there for why it can't just `router.push`).

BFF errors arrive as `ApiError {code, message, details, status}` — the same
`{error:{code,message,details}}` shape `vertice-bff/docs/api-contract.md` documents. Screens use
`useRedirectOnError` (`src/lib/hooks/`) to bounce on `FORBIDDEN`/`NOT_FOUND` (someone else's
student/plan/workout, or a deleted one). Copy is keyed on `error.code` (`apiErrorMessage` in
`src/lib/api/errorMessages.ts`; `deleteErrorMessage` adds the "já tem treinos registrados" copy for
a delete's 409 `PRECONDITION_FAILED`), never `error.message`. Destructive actions go through
`ConfirmDialog` (`src/components/domain/`): one request per confirm (a submitting ref, not just
`isPending`), the failure shown in the dialog. `Dialog` reads `onClose` through a ref, so an inline
arrow is fine.

- **`src/lib/api/*.ts`** — one module per BFF resource (`students`, `trainingPlans`, `workouts`,
  `workoutExercises`, `exerciseSets`, `exercises`, `feedback`, `dashboard`, `auth`), thin typed
  wrappers over `apiClient`; shared wire types in `types.ts`. Add new endpoints here, not
  inline in components. `apiClient.delete(path, body?)` takes an optional JSON body (`DELETE
  /auth/me`'s `{password}`); `apiClient.download(path, fallbackName)` fetches a file as
  `{blob, filename}` (name from `Content-Disposition`, allow-listed to `[\w.-]`) with the same
  401 → logout as every call, and `saveFile` (`src/lib/download.ts`) hands it to the browser.
- **`src/lib/validation/*.ts`** — Zod schemas and the Portuguese label maps that belong to a form
  field (`setStrategyLabels`, `planLevelLabels`), consumed by `react-hook-form` via
  `@hookform/resolvers`. They stay hand-written (Zod needs the enum members at runtime), but
  `contract.test.ts` asserts every enum still equals the generated contract one.
  **Weekday labels are the exception: `src/lib/days.ts` is the one file for them** (`DAY_NAMES`,
  `DAY_ABBR`, `DAY_NAME_LOWER`, `DAY_NAMES_LONG` keyed by `DayOfWeek`, and `DAY_INITIAL` keyed by
  `WeekdayLabel`, the Mon–Fri subset the roster sends; `DAY_ORDER` next to them is the display
  ordering, not a label map), because screens outside any form render them too. `src/lib/plans.ts`
  is the same shape for a plan's derived status (`planStatus` + `planStatusLabels`, which the
  plans tab and the plan detail header both render; the badge colors stay with each screen). One label map per
  concept, in one file — never a second copy (XREPO-013) — and **keyed by the contract union it
  labels** (`Record<DayOfWeek, string>`, `Record<Role, string>`, …), never `Record<string,
  string>`: that is what makes a member added or renamed in the spec a typecheck failure instead
  of a blank or raw-code label on screen. Two deliberate shades of that rule:
  `setStrategyLabels`/`planLevelLabels` are keyed by their Zod-inferred unions, which
  `contract.test.ts` asserts equal the generated ones, so the guard holds one step removed; and
  `errorMessages` is a `Partial<Record<ApiErrorCode, string>>`, so a *new* error code does not
  fail typecheck — `apiErrorMessage` falls back for it on purpose.
- **Server state is TanStack Query** (`src/app/providers.tsx`: `staleTime` 30 s, `retry` 1).
  Mutations invalidate by query key (`["workout", id, "full"]`, `["trainingPlan", id]`, …) rather
  than updating the cache by hand.
- **UI language is Portuguese (pt-BR)** — routes (`/alunos`, `/planos`, `/exercicios`,
  `/cadastro`), labels and copy. Keep new UI in Portuguese; code identifiers stay in English.

### The BFF contract is generated, not hand-written

`src/lib/api/schema.ts` is generated by `npm run api:types` (`scripts/sync-api-types.mjs`,
`openapi-typescript`) from `vertice-bff`'s
[`docs/openapi.json`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/openapi.json) at
the commit pinned in `src/lib/api/.bff-ref`. Never edit `schema.ts`, and never add a wire type by
hand: `src/lib/api/types.ts` is only named aliases over it (`Me`, `FullWorkout`, `ApiErrorCode`,
…), and a route module that builds a request body types it from
`components["schemas"]["<Request>"]`. The names in `types.ts` are this app's where they differ
from the spec's (`StudentDetailOverview` for `ClientOverview`, `CreatedStudent` for
`CreatedClient`, `DashboardData` for `Dashboard`) — the screens say "student", the BFF's module is
"clients".

Taking a contract change: merge it in `vertice-bff` → put that merge commit's full SHA in
`.bff-ref` → `npm run api:types` (`-- --local` reads the sibling `../vertice-bff` clone instead
of GitHub) → `npm run typecheck` and fix what the new types reject → commit all of it together.
CI's `npm run api:types -- --check` fails when `schema.ts` is stale, mirroring `vertice-bff`'s own
`sync:protos -- --check` against `vertice-api` (XREPO-005, XREPO-013). Two spec quirks to know:
`GET /exercises/:id/progress` returns `weight` as a number while every other decimal is a string,
and the published `maxLength`s count code points while the server enforces UTF-16/byte bounds —
which is why the numeric and length bounds live in `src/lib/validation/bounds.ts` rather than
coming from the spec.

### Dates and times

The business time zone is `America/Sao_Paulo`, and every date-ish field the BFF answers is one of
exactly two kinds. An **instant** (`createdAt`, `completedAt`, `recordedAt`, `startedAt`,
`lastWorkoutAt`, `expiresAt`, …) is an absolute point in time, ISO-8601 with `Z`: format it *in a
zone* with `Intl` (`formatDateTime`, `formatTimeOfDay`), never by reading a clock or a day off the
string — `completedAt.slice(11, 16)` is the UTC clock, about three hours ahead of the trainer's own
(REL-API-008). A **business date** (a plan's `startDate`/`endDate`, a log's `weekStartDate`,
`expiringPlans[].end`) is a local calendar day in that zone, `yyyy-MM-dd`, with no time and no
zone: it compares and sorts as a plain string, and it never goes through a UTC conversion, because
`new Date("2026-10-31")` is UTC midnight and renders as 30/10/2026 in Brazil. `src/lib/format.ts`
is the one place that formats either kind (`formatDateShort`/`Long`/`Numeric`/`Range` for business
dates, each pairing a `Date.UTC`-built civil date with `timeZone: "UTC"`), and `todayLocalIso()`
there is the only "today" — never `new Date().toISOString().slice(0, 10)`, the UTC day, which flips
at 21:00 local. `daysUntil` and `src/lib/plans.ts`'s `planStatus` are calendar-day comparisons
between business dates for the same reason. Don't hardcode `-03:00` either: Brazil observed DST
until 2019, so older instants resolve at `-02:00`, which only the zone's rules know. This code runs
in the browser (any traveller's zone) *and* on the server during SSR (usually UTC), so a formatter
without an explicit `timeZone` is a bug; `npm run test:hostile-tz` is the guard, and it must stay
two separate processes (the `Intl.DateTimeFormat`s are built at module load, so flipping
`process.env.TZ` inside a test proves nothing). It runs one zone ahead of UTC and one behind
because the two failure modes point opposite ways: a missing `timeZone: BUSINESS_TIME_ZONE` on an
instant shows up in any non-Brazil zone, while a missing `timeZone: "UTC"` on a business date only
shows up behind UTC. The contract is `src/lib/format.test.ts` and `src/lib/plans.test.ts`, the
counterparts of `vertice-bff`'s `src/lib/dates.test.ts`. The rule is `vertice-api`'s — its
[`README.md`](https://github.com/herbertpdl/vertice-api/blob/main/README.md) ("Dates and times")
and [`CLAUDE.md`](https://github.com/herbertpdl/vertice-api/blob/main/CLAUDE.md) ("Time: instants
vs. business dates") are the source of truth, restated for clients in
[`vertice-bff/docs/api-contract.md`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/api-contract.md)
("Dates and times"), and the generated `schema.ts` carries it per field as a doc comment.

### Routes and components

- Route groups: `src/app/(auth)/` (login, cadastro — `AuthScreenShell`/`AuthBrandPanel` layout)
  and `src/app/(app)/` (everything behind the session, wrapped by `AppHeader`). Pages are server
  components that read `params`/`searchParams` and hand off to a `"use client"` `*Content.tsx`
  sibling.
- **Workout editor** (`src/components/domain/WorkoutEditor/WorkoutEditor.tsx`, reached from
  `/planos/[planId]/treinos/novo[?dayOfWeek=]` and `/planos/[planId]/treinos/[workoutId]`) is a
  debounced-autosave workspace: local draft state (`src/lib/workoutEditor/model.ts` +
  `reducer.ts`) is the source of truth and `src/lib/workoutEditor/autosave.ts` syncs it to the
  BFF — first save of a new workout is a nested `POST /training-plans/:id/workouts` (then
  `window.history.replaceState` to the workout URL, the editor stays mounted; once that `POST`
  returns an id, a retry adopts that workout instead of creating again), later saves are
  `PATCH /workouts/:id` + whole-list `PUT /workouts/:id/exercises`, and a 409
  `PRECONDITION_FAILED` (a client recorded data) flips that workout to per-item sync through the
  one-at-a-time endpoints. Exercises/sets reorder by native HTML5 drag and drop; the footer
  shows the single save status ("Salvando…"/"Salvo"/"Erro ao salvar — Tentar novamente") and
  "Concluir". The engine is a plain store with unit tests (`autosave.test.ts`, vitest `unit`
  project, node env) and is never torn down on unmount (dev StrictMode would kill it). Spec:
  `docs/specs/create-workout-with-exercises/spec.md`; PRD:
  `docs/prds/create-workout-with-exercises/prd.md`. Read both before touching the editor.
- `src/components/domain/` holds product components (dialogs, cards, rows) built on the UI kit;
  `src/components/layout/` holds shell pieces (`AppHeader`, auth shells); `src/components/ui/`
  is the design-system kit (below).

### Conventions

- **App Router only** — everything lives under `src/app`. `src/app/layout.tsx` is the root layout; note it types its props as `LayoutProps<"/">` rather than the conventional hand-written `{ children: React.ReactNode }` — this is one of this Next.js version's generated route types, see `AGENTS.md` above before assuming standard App Router conventions.
- **React Compiler is enabled** (`next.config.ts` sets `reactCompiler: true`, and `babel-plugin-react-compiler` is a dependency) — avoid manually adding `useMemo`/`useCallback`/`React.memo` for optimization purposes; the compiler handles it.
- **Path alias**: `@/*` maps to `src/*` (`tsconfig.json`).
- **Design system / UI kit** (`src/components/ui/`): Badge, Button, Checkbox, Dialog, Dropdown, ListRowSkeleton, MetricCard, PageLoadingOverlay, ProfileMenu, Skeleton, Spinner, Switch, TableRowSkeleton, TextField, Tooltip — each with a `*.stories.tsx` — re-exported from `src/components/ui/index.ts`. These were generated from the Pencil (pen.dev) design file `/Users/herbertlago/Documents/Vertice Web.pen`, not hand-authored — prefer regenerating/syncing them via the `pencil` MCP tool over editing the component source directly, and run the `pencil-design-audit` skill afterwards to confirm parity (see *Agent skills* below).
- **Design tokens live in `src/app/globals.css`** as CSS custom properties (`--color-*`, `--space-*`, `--radius-*`, `--text-*`) under `@import "tailwindcss"` (Tailwind v4). Components consume these via Tailwind arbitrary-value syntax (e.g. `bg-[var(--color-primary)]`, `rounded-[var(--radius-md)]`) rather than a `tailwind.config` theme — when adding new UI, follow this same var-based pattern instead of introducing hardcoded colors/spacing or a parallel token system.
  - **`text-[var(--foo)]` is ambiguous in Tailwind v4** — `text-*` covers both `font-size` and `color`, and Tailwind can't tell which one a bare `var()` reference means. Confirmed (via generated CSS inspection, not guesswork) that it silently resolves to `color`, which drops font-size sizing entirely and, when the class is later in source order than an intended text-color class on the same element, can null out that color too (an invalid `color: <length>` value falls back to inherited). Always add the explicit type hint: `text-[length:var(--text-base)]` for font-size, `text-[color:var(--color-primary)]` for color. The `bg-` and `border-` prefixes are not ambiguous this way and don't need a type hint.
- **Floating UI (menus, popovers) must portal out of their container.** `Dialog`'s panel is `overflow-y-auto`, so anything `position: absolute` inside it gets clipped and scrolls the panel instead of overlaying the page. `Dropdown` is the reference implementation: it `createPortal`s its menu to `document.body`, positions it `fixed` from the trigger's `getBoundingClientRect()` in a `useLayoutEffect` (re-measured on `resize` and capture-phase `scroll`), flips above the trigger when there's no room below, and uses `z-[60]` (above `Dialog`'s `z-50`). New floating UI should follow the same pattern rather than `absolute` + `top-full`. Escape inside such a popover must call `event.preventDefault()`; `Dialog` skips its own Escape-to-close when `event.defaultPrevented` is set (the App Router hydrates on `document`, so React's dispatcher and `Dialog`'s `document` listener share a node and `stopPropagation` alone can't separate them).
- **Fonts**: Inter (`font-base`) and Space Grotesk (`font-heading`) are loaded via `next/font/google` in `layout.tsx` and exposed as CSS variables consumed by the `.font-base`/`.font-heading` utility classes in `globals.css`.
- Layout-level components (e.g. `Header`) live in `src/components/layout/`, separate from the reusable `src/components/ui/` kit.
- **One folder per component** under `src/components/{ui,domain,layout}/`: `<Name>/<Name>.tsx`, its `<Name>.stories.tsx` next to it, and an `index.ts` that re-exports it — so imports stay `@/components/ui/Button` / `@/components/domain/Avatar` (folder index), never `.../Button/Button`. Sibling imports inside a folder go through the neighbour's folder (`../Spinner`), and shared story helpers that aren't components stay at the group root.

## Running

This app runs natively only — there is no `Dockerfile` — since it's the piece of the stack most
affected by slow Docker image rebuilds/caching. It runs on Node 22: `.nvmrc` says `22` (CI reads
it) and `package.json` has `"engines": { "node": ">=22 <23" }` (npm warns on other versions).
Update `package-lock.json` with Node 22's npm 10 (`npx npm@10 install …` on a newer Node): npm 11
drops some optional wasm entries that npm 10's `npm ci` in CI then reports as missing. It needs `vertice-bff` on `:3000` (which in turn needs
`vertice-api`); see the sibling `vertice-local` repo for bringing the rest of the stack up.
`BFF_URL` overrides the BFF base URL (default `http://localhost:3000`).
Server config is read only via `src/lib/env.server.ts` (`serverEnv()`, parsed with Zod once).

## Feature workflow: PRD → design → spec → code

Non-trivial features are defined first as a PRD under `docs/prds/<feature-slug>/prd.md`
(product rules only, same template as `vertice-api`'s PRDs, produced by interviewing the owner)
and then a technical spec under `docs/specs/<feature-slug>/spec.md`. The web is usually the last
repo to change for a feature: the API PRD/spec live in `vertice-api/docs/`, the endpoint
contract in `vertice-bff/docs/`, and the web PRD points at both. **Cross-repo references in
docs are GitHub links** (`https://github.com/herbertpdl/<repo>/blob/main/<path>`), never
`../<repo>/...` relative paths — the sibling checkouts are not guaranteed to sit next to each
other. Same-repo references stay relative.

Every spec that touches more than one repo has a **"Merge and deploy order"** section listing
the repos in the order their PRs merge and deploy, and why (which side needs the other already
live). The default is `vertice-api` → `vertice-bff` → `vertice-web-react` / `vertice-mobile`:
the API adds RPCs before the BFF calls them, and the BFF exposes endpoints before the web uses
them. State any deviation explicitly (e.g. a removal goes clients first, API last), plus the
rollback order. There is no spec template in this repo; this rule is the template. Same rule as
`vertice-bff`'s CLAUDE.md ("Reference docs").

**Design gate:** a web PRD carries a `Design:` line in its header. Before implementing, update
the pen.dev design file (`Vertice Web.pen`, via the `pencil` MCP tools) with every screen state
the PRD introduces and tell the owner; implementation starts only after the owner sets that line
to `Design: design-ok`. Do not start coding a feature whose PRD still says `Design: pending`.

## Agent skills

The repo skills in `.claude/skills/` (`pencil-design-audit`, `technical-assessment-web`) are
symlinks into the shared [`agent-skills`](https://github.com/herbertpdl/agent-skills) repo, which
is where they are maintained. The links resolve to `../../../../agent-skills/<skill>`, so clone
`agent-skills` as a sibling of the directory that holds this checkout (e.g.
`~/Workspace/agent-skills` next to `~/Workspace/vertice/vertice-web-react`). Without it, the
skills are dangling links and unavailable. Edit skills in `agent-skills`, not here.
