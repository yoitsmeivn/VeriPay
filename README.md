# VeriPay

Peer-to-peer conditional payments — Auth0 for authentication, Stripe Checkout
and Connect for money movement, Supabase Postgres for storage.

> **Status: scaffold.** The monorepo, tooling and a minimal API foundation are
> in place. Deals, payments, authentication and the real UI are not built yet.
>
> VeriPay is a conditional-payment platform built on Stripe Connect. It is not
> an escrow service or any other legally regulated financial arrangement.

## Quick start

```bash
npm install
cp .env.example .env          # then fill in values locally
npm run dev                   # API on :8787, web on :5173
```

Check it works:

```bash
curl -i http://localhost:8787/api/health
```

## Layout

```text
apps/api        Express 5 API — app factory, health endpoint, error handling
apps/web        React 19 + Vite 8 client — placeholder health screen
packages/shared     Isomorphic domain primitives, error codes, Zod contracts
packages/database   Drizzle ORM client and Supabase migration config
packages/config     Shared tsconfig, ESLint and Prettier configuration
docs/               Architecture, environment and tooling notes
```

## Commands

| Command                                      | Purpose                               |
| -------------------------------------------- | ------------------------------------- |
| `npm run dev`                                | Package watcher + API + web           |
| `npm run dev:api` / `npm run dev:web`        | One app at a time                     |
| `npm run build`                              | Build packages, API, then web         |
| `npm run typecheck`                          | `tsc --noEmit` across every workspace |
| `npm run test`                               | Vitest, all projects                  |
| `npm run lint` / `npm run format`            | ESLint / Prettier                     |
| `npm run db:generate` / `npm run db:migrate` | Drizzle migrations                    |

## Documentation

- [AGENTS.md](./AGENTS.md) — structure, boundaries and domain rules (start here)
- [docs/architecture.md](./docs/architecture.md) — request lifecycle and layering
- [docs/environment.md](./docs/environment.md) — every environment variable
- [docs/tooling.md](./docs/tooling.md) — version choices, including the TypeScript pin

## Conventions worth knowing up front

- **Money is always integer minor units.** Never a float.
- **Auth0 authenticates; VeriPay authorizes.** A valid token is not a permission.
- **Only signature-verified Stripe webhooks change payment state.** Never a
  client redirect.
- Supabase has two connections: `SUPABASE_POOLER_URL` (6543) for the API
  runtime, `SUPABASE_DB_URL` (5432) for migrations. There is no `DATABASE_URL`.
