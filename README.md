# Vertice Web (React)

Web application for Vertice Coach, replacing the previous Vue-based `vertice-web`.

Trainer-side features are implemented (see `CLAUDE.md`, "Project status").

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

## Deployment: client IPs and the BFF's rate limits

The BFF rate-limits auth routes (and all traffic, more loosely) per client IP. The browser never
talks to the BFF; this app's server does, so on its own every web user would share this server's
address and a handful of failed logins anywhere would lock web login out for everyone. To prevent
that:

```
browser ──▶ reverse proxy(s) ──▶ Next server (this app) ──▶ vertice-bff
            appends client IP     TRUSTED_PROXY_HOPS=N        TRUST_PROXY=<Next server address>
                                  forwards X-Forwarded-For
```

- Every server-side BFF call (`src/lib/bff.ts`: the `/api/auth/*` route handlers and the
  `/api/bff/[...path]` proxy) sends `X-Forwarded-For`, ending in the address the outermost
  trusted proxy observed (`src/lib/forwardedFor.ts`).
- **vertice-bff must run with `TRUST_PROXY` set to this web server's address(es)** (comma-separated
  addresses/CIDRs, or `loopback` on a shared host). Otherwise it ignores the header. See
  [vertice-bff's README](https://github.com/herbertpdl/vertice-bff/blob/main/README.md) and
  [password-lifecycle spec](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/password-lifecycle/spec.md#client-ips-and-the-rate-limits).
- **`TRUSTED_PROXY_HOPS`** (this app, default `0`) is the number of reverse proxies in front of
  the Next server that append to `X-Forwarded-For`. Next 16 doesn't expose the socket address to
  route handlers and only fills `X-Forwarded-For` from the socket when the request has none, so
  with `0` a browser can choose its own address. Don't expose `next start` directly in
  production: put it behind a proxy that appends the client address and set the count.

Local dev needs none of this: one developer sharing a bucket with themselves is fine.
