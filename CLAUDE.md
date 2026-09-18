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
npm run dev              # dev server on http://localhost:5173 (scripts/dev-open-browser.js wraps `next dev` and opens the browser)
npm run build            # production build
npm run start            # run the production build
npm run lint             # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
npm run storybook        # Storybook on :6006 (stories live next to each src/components/ui/* component)
npx vitest               # all tests: `unit` project (node) + Storybook stories as browser tests (@storybook/addon-vitest + playwright); `--project unit` for the fast node-only run
```

The dev server is pinned to port `5173` (not Next's usual `3000`) since `3000` is
`vertice-bff`'s default port and `vertice-bff`'s `CORS_ORIGIN` already defaults to
`http://localhost:5173`. Override with `npm run dev -- -p <port>` if needed.

Besides the Storybook story tests (every `src/**/*.stories.tsx`, per `.storybook/main.ts`),
`vitest.config.ts` has a `unit` project (node environment, `src/lib/**/*.test.ts`) for pure
modules — today the workout editor's autosave engine. Pages under `src/app/` have no tests.

## Architecture

### Data flow: browser → Next route → BFF

The browser never calls `vertice-bff` directly. `src/lib/api/client.ts` (`apiClient`) fetches
`/api/bff/<path>`, which `src/app/api/bff/[...path]/route.ts` forwards to `${BFF_URL}/api/<path>`
(`src/lib/bff.ts`), attaching the JWT from the httpOnly `vertice_session` cookie
(`src/lib/session.ts`). Login/register/logout have their own routes under `src/app/api/auth/*`
that set/clear that cookie. `src/proxy.ts` is the edge guard: no cookie → `/login?redirect=`,
cookie on an auth page → `/dashboard`. On any 401 `apiClient` logs out server-side and hard-
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
  `window.history.replaceState` to the workout URL, the editor stays mounted), later saves are
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
- **Design system / UI kit** (`src/components/ui/`): Badge, Button, Checkbox, Dialog, Dropdown, ListRowSkeleton, MetricCard, PageLoadingOverlay, ProfileMenu, Skeleton, Spinner, Switch, TableRowSkeleton, TextField, Tooltip — each with a `*.stories.tsx` — re-exported from `src/components/ui/index.ts`. These were generated from the Pencil (pen.dev) design file `/Users/herbertlago/Documents/Vertice Web.pen`, not hand-authored — prefer regenerating/syncing them via the `pencil` MCP tool over editing the component source directly, and run the `pencil-design-audit` skill (`.claude/skills/`) afterwards to confirm parity.
- **Design tokens live in `src/app/globals.css`** as CSS custom properties (`--color-*`, `--space-*`, `--radius-*`, `--text-*`) under `@import "tailwindcss"` (Tailwind v4). Components consume these via Tailwind arbitrary-value syntax (e.g. `bg-[var(--color-primary)]`, `rounded-[var(--radius-md)]`) rather than a `tailwind.config` theme — when adding new UI, follow this same var-based pattern instead of introducing hardcoded colors/spacing or a parallel token system.
  - **`text-[var(--foo)]` is ambiguous in Tailwind v4** — `text-*` covers both `font-size` and `color`, and Tailwind can't tell which one a bare `var()` reference means. Confirmed (via generated CSS inspection, not guesswork) that it silently resolves to `color`, which drops font-size sizing entirely and, when the class is later in source order than an intended text-color class on the same element, can null out that color too (an invalid `color: <length>` value falls back to inherited). Always add the explicit type hint: `text-[length:var(--text-base)]` for font-size, `text-[color:var(--color-primary)]` for color. The `bg-` and `border-` prefixes are not ambiguous this way and don't need a type hint.
- **Floating UI (menus, popovers) must portal out of their container.** `Dialog`'s panel is `overflow-y-auto`, so anything `position: absolute` inside it gets clipped and scrolls the panel instead of overlaying the page. `Dropdown` is the reference implementation: it `createPortal`s its menu to `document.body`, positions it `fixed` from the trigger's `getBoundingClientRect()` in a `useLayoutEffect` (re-measured on `resize` and capture-phase `scroll`), flips above the trigger when there's no room below, and uses `z-[60]` (above `Dialog`'s `z-50`). New floating UI should follow the same pattern rather than `absolute` + `top-full`. Escape inside such a popover must call `event.preventDefault()`; `Dialog` skips its own Escape-to-close when `event.defaultPrevented` is set (the App Router hydrates on `document`, so React's dispatcher and `Dialog`'s `document` listener share a node and `stopPropagation` alone can't separate them).
- **Fonts**: Inter (`font-base`) and Space Grotesk (`font-heading`) are loaded via `next/font/google` in `layout.tsx` and exposed as CSS variables consumed by the `.font-base`/`.font-heading` utility classes in `globals.css`.
- Layout-level components (e.g. `Header`) live in `src/components/layout/`, separate from the reusable `src/components/ui/` kit.
- **One folder per component** under `src/components/{ui,domain,layout}/`: `<Name>/<Name>.tsx`, its `<Name>.stories.tsx` next to it, and an `index.ts` that re-exports it — so imports stay `@/components/ui/Button` / `@/components/domain/Avatar` (folder index), never `.../Button/Button`. Sibling imports inside a folder go through the neighbour's folder (`../Spinner`), and shared story helpers that aren't components stay at the group root.

## Running

This app runs natively only — there is no `Dockerfile` — since it's the piece of the stack most
affected by slow Docker image rebuilds/caching. Match Node 22 locally; there's no `engines` field
in `package.json` to enforce it. It needs `vertice-bff` on `:3000` (which in turn needs
`vertice-api`); see the sibling `vertice-local` repo for bringing the rest of the stack up.
`BFF_URL` overrides the BFF base URL (default `http://localhost:3000`).

## Feature workflow: PRD → design → spec → code

Non-trivial features are defined first as a PRD under `docs/prds/<feature-slug>/prd.md`
(product rules only, same template as `vertice-api`'s PRDs, produced by interviewing the owner)
and then a technical spec under `docs/specs/<feature-slug>/spec.md`. The web is usually the last
repo to change for a feature: the API PRD/spec live in `vertice-api/docs/`, the endpoint
contract in `vertice-bff/docs/`, and the web PRD points at both. **Cross-repo references in
docs are GitHub links** (`https://github.com/herbertpdl/<repo>/blob/main/<path>`), never
`../<repo>/...` relative paths — the sibling checkouts are not guaranteed to sit next to each
other. Same-repo references stay relative.

**Design gate:** a web PRD carries a `Design:` line in its header. Before implementing, update
the pen.dev design file (`Vertice Web.pen`, via the `pencil` MCP tools) with every screen state
the PRD introduces and tell the owner; implementation starts only after the owner sets that line
to `Design: design-ok`. Do not start coding a feature whose PRD still says `Design: pending`.
