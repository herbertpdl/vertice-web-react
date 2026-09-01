# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Vertice Web (React) is a from-scratch replacement for the previous Vue-based `vertice-web`. It is currently a **bootstrapped skeleton**: Next.js App Router + TypeScript + Tailwind CSS, with a design-system component library, but no product features implemented yet.

## Commands

```bash
npm run dev      # start the dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run the production build
npm run lint     # ESLint (flat config, eslint-config-next core-web-vitals + typescript)
```

There is no test suite configured in this repository yet.

## Architecture

- **App Router only** — everything lives under `src/app`. `src/app/layout.tsx` is the root layout; note it types its props as `LayoutProps<"/">` rather than the conventional hand-written `{ children: React.ReactNode }` — this is one of this Next.js version's generated route types, see `AGENTS.md` above before assuming standard App Router conventions.
- **React Compiler is enabled** (`next.config.ts` sets `reactCompiler: true`, and `babel-plugin-react-compiler` is a dependency) — avoid manually adding `useMemo`/`useCallback`/`React.memo` for optimization purposes; the compiler handles it.
- **Path alias**: `@/*` maps to `src/*` (`tsconfig.json`).
- **Design system / UI kit** (`src/components/ui/`): Button, Badge, Checkbox, Dropdown, MetricCard, ProfileMenu, Switch, TextField, Tooltip, re-exported from `src/components/ui/index.ts`. These were generated from a Pencil (pen.dev) design file, not hand-authored — prefer regenerating/syncing them via the `pencil` MCP tool over editing the component source directly, so they stay consistent with the design file.
- **Design tokens live in `src/app/globals.css`** as CSS custom properties (`--color-*`, `--space-*`, `--radius-*`, `--text-*`) under `@import "tailwindcss"` (Tailwind v4). Components consume these via Tailwind arbitrary-value syntax (e.g. `bg-[var(--color-primary)]`, `rounded-[var(--radius-md)]`) rather than a `tailwind.config` theme — when adding new UI, follow this same var-based pattern instead of introducing hardcoded colors/spacing or a parallel token system.
  - **`text-[var(--foo)]` is ambiguous in Tailwind v4** — `text-*` covers both `font-size` and `color`, and Tailwind can't tell which one a bare `var()` reference means. Confirmed (via generated CSS inspection, not guesswork) that it silently resolves to `color`, which drops font-size sizing entirely and, when the class is later in source order than an intended text-color class on the same element, can null out that color too (an invalid `color: <length>` value falls back to inherited). Always add the explicit type hint: `text-[length:var(--text-base)]` for font-size, `text-[color:var(--color-primary)]` for color. The `bg-` and `border-` prefixes are not ambiguous this way and don't need a type hint.
- **Fonts**: Inter (`font-base`) and Space Grotesk (`font-heading`) are loaded via `next/font/google` in `layout.tsx` and exposed as CSS variables consumed by the `.font-base`/`.font-heading` utility classes in `globals.css`.
- Layout-level components (e.g. `Header`) live in `src/components/layout/`, separate from the reusable `src/components/ui/` kit.

## Docker

`Dockerfile` builds a dev-mode image (`node:22-alpine`, `npm ci`, runs `npm run dev`) — there is no production/multi-stage build defined yet.
Match Node 22 locally if not using Docker — there's no `engines` field in `package.json` to enforce it.
