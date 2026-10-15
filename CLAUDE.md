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
npm run test:storybook   # vitest `storybook` project: every story as a headless Chromium test (@storybook/addon-vitest + playwright)
npm test                 # both projects
npm run storybook        # Storybook on :6006 (stories live next to each src/components/ui/* component)
```

CI (`.github/workflows/ci.yml`, on every PR and push to `main`) runs two jobs: `build-and-test`
(`npm ci` → lint → typecheck → `test:unit` → build → `npm audit --omit=dev --audit-level=high`)
and `storybook` (Playwright Chromium, then `test:storybook`). Run the same commands locally
before pushing. The build needs no BFF and no env.

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
use it, and `relayBffResponse` (keeps `Retry-After`, null body on 204), for any new route.
Every `/api/*` handler starts with `guardApiRequest(request, "json" | "optional-json" | "none")`
(`src/lib/requestGuard.ts`): 403 unless `Sec-Fetch-Site`/`Origin` say same-origin (unsafe methods
must carry `Origin`), 415 for a non-JSON body. The BFF proxy encodes each path segment and 400s
`.`, `..`, empty or slash-carrying ones (`bffProxyPath` in `src/lib/bff.ts`). The session cookie
is `HttpOnly`, `SameSite=Strict`, `Secure` when the server runs with `NODE_ENV=production`.
`src/proxy.ts` is the edge guard: no cookie → `/login?redirect=<path>`, cookie on an auth page →
the `redirect` path or `/dashboard`, `/definir-senha`, `/termos` and `/privacidade` public either
way. Inside `(app)`, `TermsConsentGate` replaces the page with a blocking notice until `GET
/auth/me`'s `consent.termsVersion` equals `LEGAL_VERSIONS.terms` (`src/lib/legal/versions.ts`, the
version of the draft texts this build ships; register sends it as `acceptedTermsVersion`). A `redirect` value only
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
student/plan/workout, or a deleted one).

- **`src/lib/api/*.ts`** — one module per BFF resource (`students`, `trainingPlans`, `workouts`,
  `workoutExercises`, `exerciseSets`, `exercises`, `feedback`, `dashboard`, `auth`), thin typed
  wrappers over `apiClient`; shared response types in `types.ts`. Add new endpoints here, not
  inline in components.
- **`src/lib/validation/*.ts`** — Zod schemas + Portuguese label maps (e.g. `setStrategyLabels`,
  `muscleGroupLabels`) consumed by `react-hook-form` via `@hookform/resolvers`.
- **Server state is TanStack Query** (`src/app/providers.tsx`: `staleTime` 30 s, `retry` 1).
  Mutations invalidate by query key (`["workout", id, "full"]`, `["trainingPlan", id]`, …) rather
  than updating the cache by hand.
- **UI language is Portuguese (pt-BR)** — routes (`/alunos`, `/planos`, `/exercicios`,
  `/cadastro`), labels and copy. Keep new UI in Portuguese; code identifiers stay in English.

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
