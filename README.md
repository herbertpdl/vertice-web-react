# Vertice Web (React)

Web application for Vertice Coach, replacing the previous Vue-based `vertice-web`.

Trainer-side features are implemented (see `CLAUDE.md`, "Project status").

## Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- React Compiler (enabled via `next.config.ts`)

## Getting started

Requires Node 22 (`.nvmrc`; `package.json` `engines` is `>=22 <23`), e.g. `nvm use`.

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
- `npm run lint` — run ESLint with `--max-warnings 0` (any warning fails it)
- `npm run typecheck` — `next typegen` (route types such as `LayoutProps`) then `tsc --noEmit`
- `npm run test:unit` — fast node-only tests (vitest `unit` project: `src/lib/**`, `src/app/api/**`)
- `npm run test:storybook` — every story rendered and played in headless Chromium (vitest
  `storybook` project; run `npx playwright install chromium` once first)
- `npm test` — both vitest projects
- `npm run storybook` — Storybook on `:6006`
- `npm run api:types` — regenerate `src/lib/api/schema.ts` from `vertice-bff`'s OpenAPI document
  (see "The BFF contract" below); `-- --check` only verifies, `-- --local` reads a sibling clone

## The BFF contract

`src/lib/api/schema.ts` is **generated**, never hand-edited: `openapi-typescript` turns
[`vertice-bff/docs/openapi.json`](https://github.com/herbertpdl/vertice-bff/blob/main/docs/openapi.json)
into TypeScript at the `vertice-bff` commit pinned in `src/lib/api/.bff-ref` — the same pattern
`vertice-bff` uses to pin `vertice-api`'s protos. `src/lib/api/types.ts` is nothing but named
aliases over it (`Me`, `FullWorkout`, …), so every wire shape this app believes in comes from the
BFF's own route schemas.

To take a contract change:

1. Merge it in `vertice-bff` (its CI regenerates `docs/openapi.json`).
2. Put that merge commit's full SHA in `src/lib/api/.bff-ref`.
3. `npm run api:types` (add `-- --local` to read the sibling `../vertice-bff` checkout instead of
   GitHub), then `npm run typecheck` and fix whatever the new types reject.
4. Commit `.bff-ref`, `schema.ts` and the fixes together.

CI runs `npm run api:types -- --check`, which fails when `schema.ts` does not match the pinned
spec, so the generated file can never drift from the pin. The pt-BR label maps and the Zod form
schemas stay hand-written in `src/lib/validation/*` (Zod needs the members at runtime);
`src/lib/validation/contract.test.ts` asserts their enums still equal the generated ones.

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`, on the Node
version in `.nvmrc`:

- **`build-and-test`** — `npm ci`, `api:types -- --check` (the generated BFF types match the
  pinned spec), lint, typecheck, `test:unit`, `build` (no BFF or env needed) and
  `npm audit --omit=dev --audit-level=high`.
- **`storybook`** — installs Playwright's Chromium (cached per Playwright version) and runs
  `test:storybook`.

Dependabot (`.github/dependabot.yml`) opens weekly npm and GitHub Actions updates.

## Continuous deployment

Every push to `main` deploys to the `vertice` ECS cluster (us-east-2) once all of CI has passed on
that commit: the `deploy` job at the end of
[`.github/workflows/ci.yml`](.github/workflows/ci.yml). Pull requests never deploy.

1. The job runs only while the repository variable `DEPLOY_ENABLED` is `true` (Settings →
   Secrets and variables → Actions → Variables; unset it to freeze deploys). It deploys only a
   commit that is still the head of `main`, checked when the job starts and again just before
   the rollout: CI runs once per commit, so an older commit whose CI finishes last, or a re-run of
   an old run, must not overwrite a newer deploy. A superseded commit is skipped with a notice.
2. It runs on a native arm64 runner and assumes the `vertice-web-deploy` IAM role through GitHub
   OIDC (no AWS keys stored in GitHub; the role trusts only this repository's `main`). It builds
   `Dockerfile.prod` for `linux/arm64`, pushes it to ECR `vertice-web` tagged with the first 12
   characters of the commit SHA (tags are immutable; a re-run of the head commit reuses the pushed image), registers
   [`.aws/task-definition.json`](.aws/task-definition.json) with that image as a new revision of the
   `vertice-web` family, and updates the `vertice-web` service.
3. It then waits, up to 10 minutes, for the rollout to finish. If the new
   task never becomes healthy, the service's deployment circuit breaker rolls back to the
   previous revision and the job fails.

One deploy of the service runs at a time (concurrency group `deploy-vertice-web`): later ones
wait in order (`queue: max`) and are never cancelled, so the head of `main` always gets its turn. To redeploy the head of `main` without a new commit, run the CI workflow
manually on `main` (Actions → CI → Run workflow).

**The task definition is the file.** `.aws/task-definition.json` is the deployed configuration:
CPU/memory, environment and the health check; a secret appears only as its ARN, never as a value.
Change it in a pull request; the deploy registers it as is. A change made in the AWS console is
overwritten by the next deploy.

**Rolling back** means pointing the service at an earlier task-definition revision (each one pins
its image tag):

```sh
aws ecs list-task-definitions --region us-east-2 --family-prefix vertice-web --sort DESC --max-items 5
aws ecs update-service --region us-east-2 --cluster vertice --service vertice-web \
  --task-definition vertice-web:<revision>
aws ecs wait services-stable --region us-east-2 --cluster vertice --services vertice-web
```

The next push to `main` deploys again, so revert the bad commit in a pull request (or unset
`DEPLOY_ENABLED` until it is fixed).

**Order across repositories.** The pipelines are independent. When a change spans repositories,
merge in the order the spec's "Merge and deploy order" gives (by default vertice-api, then
vertice-bff, then vertice-web-react / vertice-mobile; removals go the other way), and wait for the
previous repository's deploy job to finish before merging the next one.

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

## Deployment: the image

`Dockerfile.prod` builds the deployed image: Next's standalone server (`output: "standalone"` in
`next.config.ts`, so only the traced `node_modules` ship), with `public/` and `.next/static`
beside it, run as the `node` user on port 3000 with `NODE_ENV=production`. The ECS tasks are
ARM64, so pin the platform:

```sh
docker build --platform linux/arm64 -f Dockerfile.prod -t vertice-web .
```

The deploy sets `BFF_URL` and `TRUSTED_PROXY_HOPS` (below), and `HOSTNAME=0.0.0.0` again in the
task's own environment: ECS/Fargate (like Kubernetes) overwrites the image's `HOSTNAME` with the
task's hostname, and the standalone server then listens on that address only, so the
`localhost` health check below fails and the task is replaced in a loop. On AWS the chain is CloudFront ──▶
load balancer ──▶ Next, two proxies that each append to `X-Forwarded-For`, so
`TRUSTED_PROXY_HOPS=2`; `BFF_URL` is the BFF's private Service Connect address
(`http://vertice-bff:3000`), never its public URL, or the BFF would see the NAT/public address
instead of this server and every web user would share one rate-limit bucket. Two hops is only
right while the load balancer appends to `X-Forwarded-For` (the ALB default, `append`; never
`preserve`) and refuses requests that don't come through CloudFront (its secret origin header);
otherwise a browser picks the entry this server forwards. `GET /healthz` is the
liveness check (no BFF call). The image has no curl, so a container health check runs Node:
`node -e "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"`.

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
  `/api/bff/[...path]` proxy) sends `X-Forwarded-For` with one address: the one the outermost
  trusted proxy observed (`src/lib/forwardedFor.ts`).
- **vertice-bff must run with `TRUST_PROXY` set to this web server's address(es)** (comma-separated
  addresses/CIDRs, or `loopback` on a shared host). Otherwise it ignores the header. See
  [vertice-bff's README](https://github.com/herbertpdl/vertice-bff/blob/main/README.md) and
  [password-lifecycle spec](https://github.com/herbertpdl/vertice-bff/blob/main/docs/specs/password-lifecycle/spec.md#client-ips-and-the-rate-limits).
- **`TRUSTED_PROXY_HOPS`** (this app) is the number of reverse proxies in front of the Next
  server that append to `X-Forwarded-For`. **It must be set when `NODE_ENV=production`**: if it
  is unset, `next start` exits at boot with one `[vertice] TRUSTED_PROXY_HOPS must be set…` line
  (`src/instrumentation.ts`), and every BFF call would throw (500) instead of going out. The web forwards a single entry,
  the one the outermost trusted proxy wrote; the browser-supplied part of the chain never
  reaches the BFF.
- **Why `0` is dangerous in production.** Next 16 doesn't expose the socket address to route
  handlers, and it only fills `X-Forwarded-For` from the socket when the request has none. With
  `0` and `next start` reachable directly, a browser that sends its own `X-Forwarded-For`
  chooses the address it is rate-limited under. An attacker can then:
  - rotate the header to bypass every per-IP, per-network and global limit (unlimited password
    guessing);
  - send a victim's IP with failed logins to lock that victim out (targeted denial of service).

  Explicit `0` is accepted in production only as a deliberate opt-in. Instead, put Next behind a
  proxy that appends the client address and set the count.
- **Setup tokens in access logs.** The first-access link is `/definir-senha?token=<token>`, and
  the token is a live credential for 72h. Reverse proxies log request URLs, so configure them to
  redact the `token` query parameter on `/definir-senha`. The page itself strips it from the
  address bar after loading (keeping it in the tab's `sessionStorage`, so a reload still works)
  and sends no `Referer`.

Local dev needs none of this: one developer sharing a bucket with themselves is fine.

### Deployment: HTTPS, Host and security headers

- **Serve over HTTPS.** In production the session cookie is `Secure` and the app sends
  `Strict-Transport-Security: max-age=31536000` (this host only, no `includeSubDomains`).
- **Keep the `Host` header** when proxying (nginx: `proxy_set_header Host $host;`). The `/api/*`
  handlers refuse cross-origin requests (`src/lib/requestGuard.ts`). Current browsers are judged
  by `Sec-Fetch-Site`, but for browsers that don't send it the `Origin` host is compared with the
  `Host` the server sees, and a rewritten `Host` would refuse every POST from them.
- **CSP is report-only for now.** Pages carry a nonce-based
  `Content-Security-Policy-Report-Only` (`src/lib/csp.ts`); violations only appear in the
  browser console. Once a release shows none, switch `CSP_HEADER` there to
  `Content-Security-Policy`. Clickjacking is already blocked (`X-Frame-Options: DENY` plus an
  enforced `frame-ancestors 'none'`).
