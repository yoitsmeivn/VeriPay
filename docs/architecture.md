# Architecture

VeriPay is an npm-workspaces monorepo: two applications, three packages.

```text
apps/web  ──HTTP──▶  apps/api  ──Drizzle──▶  Supabase Postgres
    │                    │
    └──── @veripay/shared ┘        @veripay/database
         (isomorphic contracts)    (API only)
```

## Workspaces

| Workspace           | Role                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apps/api`          | Express 5 HTTP API. Owns all server-side logic.                                                                          |
| `apps/web`          | React 19 + Vite 8 client. Placeholder UI at this stage.                                                                  |
| `packages/shared`   | Domain primitives, error codes, API envelope types, Zod schemas. Imported by **both** sides, so it must stay isomorphic. |
| `packages/database` | Drizzle client factory, Supabase config parsers, migrations. API only.                                                   |
| `packages/config`   | Shared tsconfig bases, ESLint flat config, Prettier config. Tooling only, no runtime code.                               |

## Dependency direction

```text
apps/web  ──▶ packages/shared
apps/api  ──▶ packages/shared, packages/database
packages/database ──▶ (nothing internal)
packages/shared   ──▶ (nothing internal)
```

Nothing points back up. `packages/shared` depends on no other workspace, which
is what lets both the Node process and the browser bundle include it.

Every rule below is enforced by `no-restricted-imports` in `eslint.config.js`,
so violations fail `npm run lint` rather than surfacing at runtime:

- `packages/shared` cannot import `node:*`, `react`, `express` or `postgres`.
- `apps/api` and `packages/**` cannot import `react`, `react-dom`, or anything
  under `apps/web`.
- `apps/web` cannot import `@veripay/database`, `express`, `pino`, `postgres`
  or `node:*`.

## Application factory vs. server

`apps/api/src/app.ts` exports `createApp({ env, logger, version })`, which
builds and returns a configured `Express` instance and **never calls
`listen`**. `apps/api/src/server.ts` is the only place that binds a socket.

That split is what makes the middleware stack testable: Supertest drives the
real app — helmet, CORS, body limits, error handling and all — without opening
a port. Add middleware and routes in the factory, not the server, or tests
stop covering them.

Dependencies are injected rather than imported as singletons. `env` and
`logger` are constructed once in `server.ts` and passed in, so a test can
supply a silent logger and a synthetic environment.

## Request lifecycle

Middleware order in `createApp` is deliberate:

1. **`requestId()`** — first, so everything downstream can correlate. Reads
   `x-request-id`, accepts it only if it matches `^[A-Za-z0-9._-]{8,128}$`
   (otherwise a fresh UUID), and echoes it on the response. Rejecting
   malformed ids prevents a caller from injecting arbitrary text into every
   log line for the request.
2. **`pino-http`** — structured request logging, using `req.id` as the log
   correlation id. `/api/health` is excluded from auto-logging so uptime polls
   do not bury real traffic.
3. **`securityHeaders()`** — helmet. One default is overridden:
   `crossOriginResourcePolicy: 'cross-origin'`, because helmet's `same-origin`
   default would instruct the browser to block the web app on `:5173` from
   reading API responses, defeating the CORS allowlist. Access control belongs
   to CORS for an API.
4. **`corsPolicy(env)`** — explicit origin allowlist from `WEB_ORIGIN`, never a
   wildcard. Unknown origins simply receive no `Access-Control-Allow-Origin`
   header. **`credentials: false`**, because authentication uses Auth0 bearer
   tokens in the `Authorization` header, not cookies; enabling credentials
   would widen CSRF exposure for no benefit.
5. **`express.json({ limit: '100kb' })`** — a body-size ceiling so an
   unauthenticated caller cannot use payload size as a memory lever.
6. **`/api` router** — currently just `GET /api/health`.
7. **`notFoundHandler()`** — forwards a typed `NotFoundError` rather than
   responding directly, so unmatched routes produce the standard envelope.
8. **`errorHandler(env, logger)`** — last, identified by Express via its arity.

## Error handling

Errors thrown deliberately are `AppError` subclasses from `@veripay/shared`,
each carrying an `ErrorCode` and an HTTP status. The handler:

- re-delegates if headers are already sent (Express cannot rewrite a flushed
  response);
- normalises transport-level failures — `ZodError`, and body-parser's
  `entity.too.large` / `entity.parse.failed` — onto the shared vocabulary.
  `@veripay/shared` knows nothing about Express, so that mapping lives in the
  API;
- logs 5xx at `error` and 4xx at `warn`, always with the request id;
- **replaces 5xx messages with a generic string in production**, so stack
  details, SQL and secrets never reach a client;
- attaches `details` only for non-5xx failures.

Every response, success or failure, uses one envelope:

```jsonc
{ "ok": true,  "data": { /* ... */ } }
{ "ok": false, "error": { "code": "NOT_FOUND", "message": "...", "requestId": "..." } }
```

The browser client branches on `ok` and never parses messages.

## Graceful shutdown

`apps/api/src/lib/shutdown.ts` provides one coordinator. On `SIGTERM` /
`SIGINT`:

1. `server.close()` — stop accepting connections, let in-flight requests
   finish, then `closeIdleConnections()` so keep-alive sockets do not hold the
   process open.
2. Run registered cleanup tasks in order, awaiting each. A task that throws is
   logged and sets a non-zero exit code, but does not strand the tasks after it.
3. Let the event loop drain naturally.

**`process.exit()` is never called before the server and every cleanup task
have had their chance to finish.** `process.exitCode` is set and Node exits on
its own. A single hard timer, sized by `SHUTDOWN_GRACE_MS`, only fires if
something is still hanging after the full grace period — and it is `unref`'d so
it cannot itself keep the process alive.

Long-lived resources register themselves:

```ts
shutdown.register('database', () => databaseClient.close());
```

## Data access

`packages/database` exposes `createDatabaseClient(config)` returning
`{ db, close }`. The client is created **once per process** over a bounded
postgres.js pool with `prepare: false` for the Supabase transaction pooler, and
`close()` is what the shutdown coordinator registers.

Runtime and migration connections are parsed separately —
see [environment.md](./environment.md#the-two-supabase-connections).

The Drizzle schema (`packages/database/src/schema/index.ts`) is intentionally
empty. Business tables land there as features are built; money columns are
`integer`/`bigint` minor units, never `numeric` or float.

## What is not built yet

Auth0 JWT verification, deals, payments, Stripe Checkout and Connect, webhook
handling, and the real UI. The standing rules that will govern them — Auth0
authenticates while VeriPay authorizes, and only signature-verified webhooks
change payment state — are written down in [AGENTS.md](../AGENTS.md).
