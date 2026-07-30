# Environment variables

`.env.example` is the template — **names and comments only, never values**.
Copy it to `.env` (git-ignored) and fill it in locally.

The Supabase entries are provisioned by Stripe Projects. Pull them with
`stripe projects env --pull` rather than writing them by hand.

## How validation works

`apps/api/src/config/env.ts` exports `loadEnv(source)`, a pure function over an
explicit source object. It runs once in `src/server.ts`; the typed result is
passed down. Nothing else in the API reads `process.env`, which is what makes
every test hermetic.

Validation is strict — unknown keys are ignored, but a supplied value that
fails its schema aborts startup with a `z.prettifyError` report rather than
booting in a half-configured state.

## Required now

Each has a development-safe default, so the API boots with no `.env` at all.

| Variable            | Default                 | Notes                                   |
| ------------------- | ----------------------- | --------------------------------------- |
| `NODE_ENV`          | `development`           | `development` \| `test` \| `production` |
| `API_PORT`          | `8787`                  | Coerced from string, 1–65535            |
| `WEB_ORIGIN`        | `http://localhost:5173` | Comma-separated CORS allowlist          |
| `API_BASE_URL`      | `http://localhost:8787` | Absolute URL                            |
| `LOG_LEVEL`         | `info`                  | pino level, or `silent`                 |
| `SHUTDOWN_GRACE_MS` | `10000`                 | Ceiling for the whole shutdown sequence |

`WEB_ORIGIN` entries must be absolute http(s) origins with no path — the exact
form a browser puts in the `Origin` header. Note that `URL.canParse` is not a
sufficient check here: it accepts `localhost:5173`, reading `localhost:` as a
scheme. The parser rejects that, because such an entry would silently never
match a real origin. A single trailing slash is tolerated and normalised away.

## Optional until the feature exists

These are declared and validated _if supplied_, but not required, because the
code that consumes each one does not exist yet. Each is annotated in `env.ts`
with the milestone that makes it required.

This is safe because the consuming module validates at the point of use.
`parseRuntimeDatabaseConfig()` hard-requires `SUPABASE_POOLER_URL` and throws
without it, so a database client cannot be built from a half-configured
environment even though the API-level parser tolerated its absence.

| Variable                                                  | Required at | Notes                                                   |
| --------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| `SUPABASE_POOLER_URL`                                     | persistence | Runtime client                                          |
| `SUPABASE_DB_URL`                                         | persistence | Migrations only                                         |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`                          | **now**     | See "Auth0" below — the API will not start without them |
| `AUTH0_CLIENT_ID`                                         | frontend    | Mirrored to `VITE_AUTH0_CLIENT_ID`                      |
| `AUTH0_CLIENT_SECRET`                                     | never       | Unused; SPA verification is public-key only             |
| `STRIPE_SECRET_KEY`                                       | payments    | Checkout and Connect                                    |
| `STRIPE_WEBHOOK_SECRET`                                   | payments    | Webhook signature verification                          |
| `STRIPE_CONNECT_RETURN_URL`, `STRIPE_CONNECT_REFRESH_URL` | payments    | Connect onboarding redirects                            |
| `APP_BASE_URL`                                            | links       | Server-generated user-facing links                      |
| `TOKEN_HASH_SECRET`                                       | tokens      | Minimum 32 characters                                   |

## Auth0

`AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are `.optional()` in the API schema so
tooling and tests can build an environment without them, but `parseAuthConfig`
in `apps/api/src/auth/jwt.ts` hard-requires both. `server.ts` calls it at
startup and **exits rather than serving `/api/me` without a working verifier**.

`AUTH0_DOMAIN` and `AUTH0_CLIENT_ID` come from Stripe Projects.
`AUTH0_AUDIENCE` does not — the catalog has no API/resource-server service, so
the API (`VeriPay API` / `https://api.veripay` / RS256) is created by hand in
the Auth0 dashboard. Full walkthrough in [auth0.md](./auth0.md).

`AUTH0_CLIENT_SECRET` may be present but is **never read**. SPA access-token
verification is asymmetric: Auth0 signs with its private key and the API checks
the public key from JWKS.

## The two Supabase connections

Supabase exposes this project twice, and the two are **not** interchangeable.

### `SUPABASE_POOLER_URL` — port 6543, transaction pooler

For the long-running API process. Supavisor hands each statement to whichever
backend is free, so **prepared statements must be disabled** — a statement
prepared on one connection will not exist on the next.
`createDatabaseClient()` sets `prepare: false` for exactly this reason, driven
by `usesTransactionPooler` from the parsed config.

Pooling is bounded (`DATABASE_POOL_MAX`, default 10). Build the client once per
process, never per request.

### `SUPABASE_DB_URL` — port 5432, direct connection

For `npm run db:generate` and `npm run db:migrate` only. DDL and migration
advisory locks do not work reliably through the transaction pooler.
`drizzle.config.ts` reads this variable and nothing else.

### No generic `DATABASE_URL`

Deliberately absent. A single ambiguous variable is how the wrong connection
ends up in the wrong place — a failure that surfaces only under load or
half-way through a migration. Each parser requires its own variable and
**rejects the other one's port** with an explanatory error.

## Browser variables

Vite exposes only `VITE_`-prefixed variables to the bundle. `vite.config.ts`
sets `envDir: '../..'` so the web app reads the same root `.env`; the
non-`VITE_` secrets in that file are not exposed.

| Variable               | Default                 | Notes                           |
| ---------------------- | ----------------------- | ------------------------------- |
| `VITE_API_BASE_URL`    | `http://localhost:8787` |                                 |
| `VITE_AUTH0_DOMAIN`    | _(none)_                | Same value as `AUTH0_DOMAIN`    |
| `VITE_AUTH0_CLIENT_ID` | _(none)_                | Same value as `AUTH0_CLIENT_ID` |
| `VITE_AUTH0_AUDIENCE`  | _(none)_                | Same value as `AUTH0_AUDIENCE`  |

The three `VITE_AUTH0_*` variables are **optional and must be set together**.
They are optional so `npm run build` and the test suite pass on a checkout with
no Auth0 values; when any is missing the app renders an "Auth0 is not
configured" notice instead of a login button. They are copied by hand because
Stripe Projects generates unprefixed names and Vite only exposes `VITE_` ones.

Anything added here ships to the browser in plain text. Never put a secret in
a `VITE_` variable — in particular there is no `VITE_` counterpart for the
Auth0 client secret, and there must never be one.
`apps/web/src/no-secret-leak.test.ts` fails the build if a confidential
variable name appears anywhere under `apps/web/src` or `apps/web/dist`.
`apps/web/src/env.ts` validates these and `src/vite-env.d.ts` types them.

## Secret handling

- `.env` and `.env.*` are git-ignored; `.env.example` is the one exception.
- `.projects/vault/` (Stripe Projects credential vault) is git-ignored.
- Verify with `git check-ignore -v .env`.
- The logger redacts `authorization`, `cookie`, `set-cookie` and
  `stripe-signature` headers, plus any `password`, `token` or `secret` field.
- Never echo a value into a log, a commit message, documentation or an agent
  transcript. Read names, not values.
