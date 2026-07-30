---
name: veripay-backend-typescript
description: Use when writing or changing TypeScript backend code in this repository — apps/api, packages/shared, or packages/database. Covers the app factory pattern, boundary validation, typed errors, money handling, logging, shutdown hooks and test expectations.
---

# Safe TypeScript backend development in VeriPay

Read [AGENTS.md](../../../AGENTS.md) first for the domain rules. This skill is
the how-to for changing backend code without breaking the guarantees it makes.

## Before you start

```bash
npm run build:packages   # apps resolve @veripay/shared from dist/, not src/
```

Stale `dist/` output is the most common cause of a confusing type error after
editing `packages/shared`. `npm run dev` runs `tsc -b --watch` for you.

## Adding an endpoint

1. **Define the contract first** in `packages/shared/src/schemas.ts`. The route
   and the client both parse against it, so drift fails a test rather than
   producing `undefined` in a component.
2. **Write the route** under `apps/api/src/routes/`, returning a `Router`.
   Mount it in `routes/index.ts`.
3. **Register it in the factory**, not the server. `src/app.ts` builds the app;
   `src/server.ts` only calls `listen`. Anything added in `server.ts` is
   invisible to Supertest.
4. **Validate every input at the boundary** with Zod — params, query and body.
   Never trust a client value that has not been parsed.
5. **Return the envelope**: `res.json(apiSuccess(payload))`. For failures,
   `throw` an `AppError` subclass and let the error handler format it. Express 5
   forwards async rejections automatically, so `async` handlers need no
   try/catch wrapper.
6. **Add a Supertest case** covering the success path, the error path, and the
   response shape validated against the shared schema.

```ts
// routes/deals.ts
export function dealsRouter(deps: DealsRouterDeps): Router {
  const router = Router();

  router.get('/deals/:id', async (req, res) => {
    const { id } = dealIdParamsSchema.parse(req.params);
    const deal = await deps.deals.findById(id);
    if (deal === undefined) {
      throw new NotFoundError(`Deal ${id} not found`);
    }
    res.json(apiSuccess(dealSchema.parse(deal)));
  });

  return router;
}
```

## Errors

Throw typed errors; never hand-roll an error response.

```ts
// Good
throw new ForbiddenError('Only a party to this deal may release funds');

// Wrong — bypasses the envelope, the request id and the logging
res.status(403).json({ error: 'forbidden' });
```

Use the subclass that matches the situation: `ValidationError`,
`UnauthenticatedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`,
`PayloadTooLargeError`, `UpstreamUnavailableError`, `InternalError`. Adding a
new failure mode means adding a code to `ERROR_CODES` and its status to
`HTTP_STATUS_BY_ERROR_CODE` — the `Record<ErrorCode, number>` type makes that
non-optional.

`details` is client-visible. Never put a secret, a stack trace or PII in it.

## Money

Integer minor units, always. See AGENTS.md for the rule; the mechanics:

```ts
const fee = multiplyMoney(total, 0.025, 'half-even'); // explicit rounding
const [toSeller, toPlatform] = allocateMoney(total, [975, 25]); // conserves the total
const amountMinor = parseMajorToMinor(req.body.amount, 'usd'); // decimal STRING only
```

`parseMajorToMinor` refuses a `number` by design — `0.29 * 100` is
`28.999999999999996`. Accept the amount as a string from the client and parse
it. Never reconstruct an amount from a formatted display string.

## Configuration

Nothing reads `process.env` outside `loadEnv()` and the database config
parsers. Take the typed `Env` as a parameter.

```ts
export function makeThing(env: Env, logger: Logger): Thing {
  /* ... */
}
```

Adding a variable: add it to the schema in `apps/api/src/config/env.ts`, to
`.env.example` (name and comment, **no value**), and to `docs/environment.md`.
If the feature that consumes it does not exist yet, mark it `.optional()` with
a `TODO(milestone)` comment — and make sure the consuming module requires it at
the point of use, the way `parseRuntimeDatabaseConfig` does.

## Database

```ts
const config = parseRuntimeDatabaseConfig(process.env); // requires SUPABASE_POOLER_URL
const client = createDatabaseClient(config);
shutdown.register('database', () => client.close()); // always register cleanup
```

Build the client **once per process**. A client per request exhausts the
pooler's connection budget. `SUPABASE_POOLER_URL` (6543) is runtime;
`SUPABASE_DB_URL` (5432) is migrations only — the parsers reject each other's
port.

New tables go in `packages/database/src/schema/`, then `npm run db:generate`,
then review the generated SQL before `npm run db:migrate`. **Do not run either
without being asked** — they touch the real Supabase database.

## Logging

Use the injected pino logger. `console` is an ESLint error everywhere except
`server.ts` (which reports fatal startup failures before a logger exists) and
`drizzle.config.ts` (which runs under the CLI).

```ts
logger.info({ dealId, requestId: req.id }, 'deal funded');
```

Structured fields, not string interpolation. Never log tokens, secrets, card
data or PII — check the `redact` list in `lib/logger.ts` and extend it when you
add a sensitive field.

## Long-lived resources

Anything holding a socket, a timer or a file handle registers cleanup:

```ts
shutdown.register('name', async () => {
  await resource.close();
});
```

Tasks run in registration order after the HTTP server closes. Do not call
`process.exit()` anywhere — the coordinator owns termination, and exiting early
truncates in-flight requests and cleanup.

## Tests

```bash
npm run test              # all projects
npx vitest run --root apps/api
```

- Build the environment explicitly: `loadEnv({ NODE_ENV: 'test', ... })`. Never
  mutate `process.env`.
- Inject a silent logger: `pino({ level: 'silent' })`.
- Validate responses with the shared Zod schema, not hand-written literals.
- No test may open a socket to Supabase or call Stripe.
- Cover the failure path. A route with only a happy-path test is not covered.

## Hard rules

- **No `any`.** If an external boundary forces it, narrow immediately and
  comment why. Prefer `unknown` plus a type guard.
- **No `eslint-disable`, no `@ts-expect-error`, no `@ts-ignore`.** Fix the
  cause. If a lint rule is genuinely wrong for the repository, change it in
  `packages/config/eslint.base.js` with a comment, not inline.
- **Do not weaken `tsconfig`** to make an error go away.
- **Do not import across a boundary** — see AGENTS.md. The linter will stop
  you; do not work around it.
- **Do not deploy, commit, push, rotate credentials, run migrations, or
  provision infrastructure** without explicit instruction in the current
  request.
