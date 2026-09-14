# Vertice Web (React)

Web application for Vertice Coach, replacing the previous Vue-based `vertice-web`.

Skeleton status: bootstrapped with Next.js (App Router), TypeScript, Tailwind CSS, and the React Compiler. No features implemented yet.

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- React Compiler (enabled via `next.config.ts`)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). (The dev server defaults to port `5173`,
not Next's usual `3000`, since `3000` is `vertice-bff`'s default port — see "Running the full
stack" below.)

## Scripts

- `npm run dev` — start the dev server (port `5173`; override with `npm run dev -- -p <port>`)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint

## Running the full stack

This app talks to `vertice-bff` (server-side only, via `BFF_URL` — see `.env.local.example`),
which in turn talks to `vertice-api` over gRPC. To run everything locally without Docker, as
sibling checkouts:

```
Workspace/
├── vertice-web-react/   (this repo)
├── vertice-bff/
└── vertice-api/
```

1. `vertice-api` — `docker compose up -d` (starts Postgres only), then
   `./gradlew bootRun --args='--spring.profiles.active=local'` (gRPC on `:9090`, auth disabled).
2. `vertice-bff` — `cp .env.example .env && npm install && npm run dev` (REST on `:3000`; its
   `.env.example` already sets `CORS_ORIGIN=http://localhost:5173` to match this app's port).
3. `vertice-web-react` (this repo) — `cp .env.local.example .env.local && npm install && npm run dev`
   (`:5173`).

A `vertice-local` repo with a `docker-compose.yml` also exists for running all of this in
containers with one command, but native runs (as above) avoid Docker image-cache/rebuild pain,
especially for this frontend.
