# Auth0

Auth0 provides login for **registered VeriPay accounts**. The React app is a
single-page application; the Express API is a resource server that verifies
RS256 access tokens against Auth0's JWKS.

## Who Auth0 is for

**Registered VeriPay users** sign up and sign in through Auth0, reach the
dashboard, and create deals as either buyer or seller.

**Guest link recipients never touch Auth0.** They do not sign in, do not create
an account, and never appear in the Auth0 tenant. A guest arrives through a
signed link and is authorized by that link alone. Guest handling is not
implemented yet — when it is, it must not route through anything in this
document.

Auth0 answers **who the caller is**. What that caller may do is VeriPay's
decision, made against VeriPay's own data — is this user a party to this deal,
is the deal in a state that permits this action. A valid token is never, on its
own, permission to do anything.

## What Stripe Projects provisioned

Auth0 was already linked at the Stripe account level, so only two things were
added to the VeriPay project:

```bash
DEV_MODE=true stripe projects add auth0/free
DEV_MODE=true stripe projects add auth0/client --name veripay-spa --config '{"name":"VeriPay SPA"}'
```

| Resource      | Provider | Service  | Pricing |
| ------------- | -------- | -------- | ------- |
| `auth0-plan`  | Auth0    | `free`   | Free    |
| `veripay-spa` | Auth0    | `client` | Free    |

The plan is required because `auth0/client` is a **component** service — its
catalog entry lists the Auth0 plans as `parent_services`, and the project had no
Auth0 plan before this.

Generated environment variable **names** (values live in the git-ignored `.env`
and the Stripe Projects vault):

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

Provider config (`locality`, `naming_prefix`) could not be supplied — the CLI
returns `PROVIDER_CONFIG_NOT_ALLOWED` because Auth0 was already linked. It can
only be set when a link is first created.

## What still requires the Auth0 dashboard

The Stripe Projects catalog has **no API / resource-server service** — only
`client` and the plans. So the API audience must be created by hand, and it
must exist before any access token will work.

### 1. Create the API

Auth0 Dashboard → **Applications → APIs → Create API**

| Field                 | Value                 |
| --------------------- | --------------------- |
| Name                  | `VeriPay API`         |
| Identifier (audience) | `https://api.veripay` |
| Signing algorithm     | `RS256`               |

The identifier is an **audience string, not a URL that has to resolve**. Nothing
is ever deployed at `https://api.veripay`. It only has to match
`AUTH0_AUDIENCE` and `VITE_AUTH0_AUDIENCE` exactly, character for character.

### 2. Configure the SPA application

Auth0 Dashboard → **Applications → `VeriPay SPA` → Settings**

| Setting                | Value                   |
| ---------------------- | ----------------------- |
| Application Type       | Single Page Application |
| Allowed Callback URLs  | `http://localhost:5173` |
| Allowed Logout URLs    | `http://localhost:5173` |
| Allowed Web Origins    | `http://localhost:5173` |
| Allowed Origins (CORS) | `http://localhost:5173` |

There is **no Next.js callback path** (`/api/auth/callback/...`) and **no
`AUTH0_SECRET`**. Those belong to the Next.js server-rendered SDK. This stack is
React with Vite, so the browser handles the redirect at the app origin itself.

## Environment variables

The backend and browser use different names on purpose. Stripe Projects
generates the backend names; the `VITE_` ones are copied across by hand.

| Backend (from Stripe Projects)   | Browser                | Notes                                           |
| -------------------------------- | ---------------------- | ----------------------------------------------- |
| `AUTH0_DOMAIN`                   | `VITE_AUTH0_DOMAIN`    | Same value. Tenant domain, no scheme.           |
| `AUTH0_CLIENT_ID`                | `VITE_AUTH0_CLIENT_ID` | Same value. A public client id is not a secret. |
| `AUTH0_AUDIENCE` _(set by hand)_ | `VITE_AUTH0_AUDIENCE`  | Both `https://api.veripay`.                     |
| `AUTH0_CLIENT_SECRET`            | **none — never**       | See below.                                      |

**The Auth0 client secret must never be given a `VITE_` counterpart.** Vite
inlines every `VITE_`-prefixed variable into the bundle as plain text, so any
visitor could read it. It is a confidential-client credential; an SPA is a
public client and has none. SPA access-token verification is asymmetric —
Auth0 signs with its private key, the API checks the matching public key from
JWKS — so the secret has no role here at all.

`apps/web/src/no-secret-leak.test.ts` fails the build if a confidential variable
name appears anywhere under `apps/web/src` or in `apps/web/dist`. That check is
strict enough to catch the name in a comment, so refer to the secret in prose
rather than by name inside `apps/web`.

`AUTH0_CLIENT_SECRET` may stay in `.env`. It is simply unused.

## The React SPA flow

1. `apps/web/src/main.tsx` mounts `<Auth0Provider>` with `domain`, `clientId`
   and `authorizationParams.audience`. **The audience is required** — without it
   Auth0 issues an opaque token that the API cannot verify.
   `cacheLocation="memory"` keeps tokens out of browser storage.
2. `AuthControls` calls `loginWithRedirect()`. Auth0 authenticates the user and
   redirects back to `window.location.origin`.
3. `useApiClient()` builds an API client whose token provider calls
   `getAccessTokenSilently({ authorizationParams: { audience } })`.
4. `createApiClient` attaches `Authorization: Bearer <token>` to protected
   requests only. `GET /api/health` is public and never carries the header.
5. `logout({ logoutParams: { returnTo: window.location.origin } })` ends it.

If the three `VITE_AUTH0_*` variables are absent the provider is not mounted at
all and the app shows an "Auth0 is not configured" notice. This keeps
`npm run build` and the test suite working on a checkout with no Auth0 values.

## Express API validation

`apps/api/src/auth/jwt.ts` verifies every token with `jose`:

```ts
await jwtVerify(token, jwks, {
  issuer: `https://${domain}/`, // trailing slash — Auth0's iss claim
  audience: 'https://api.veripay',
  algorithms: ['RS256'],
});
```

Checked on every request: **signature** against the tenant JWKS, **issuer**,
**audience**, **expiry**, and the **algorithm**. Pinning `algorithms` is what
defeats `alg: none` and RS256→HS256 confusion, where an attacker signs a token
using the public key as an HMAC secret.

`parseAuthConfig` hard-requires `AUTH0_DOMAIN` and `AUTH0_AUDIENCE`, so
`server.ts` refuses to start without them rather than serving a protected route
it cannot actually protect.

Every failure becomes an `UnauthenticatedError` → HTTP 401 in the standard
envelope, carrying the request id and leaking neither the token nor any `jose`
internals:

```json
{
  "ok": false,
  "error": { "code": "UNAUTHENTICATED", "message": "Access token has expired", "requestId": "…" }
}
```

### Routes

| Route             | Access                                              |
| ----------------- | --------------------------------------------------- |
| `GET /api/health` | **Public.** No token. Uptime checks depend on this. |
| `GET /api/me`     | **Protected.** Returns the verified principal.      |

`requireAuth` is applied per-router rather than by mount order, so a future
public route added under `/api` cannot accidentally inherit — or lose — it.
`requirePrincipal(req)` throws instead of returning `undefined`, so a handler
that forgot `requireAuth` fails closed.

`GET /api/me` currently returns the token claims only, with **no database
access**. Synchronising Auth0 subjects (`sub`) into VeriPay user records is the
next task.

## Local setup checklist

1. `stripe projects env --pull` — writes `AUTH0_*` into `.env`.
2. Create the API in the Auth0 dashboard (step 1 above).
3. Configure the SPA URLs (step 2 above).
4. Add to `.env` by hand:
   - `AUTH0_AUDIENCE=https://api.veripay`
   - `VITE_AUTH0_DOMAIN` = same value as `AUTH0_DOMAIN`
   - `VITE_AUTH0_CLIENT_ID` = same value as `AUTH0_CLIENT_ID`
   - `VITE_AUTH0_AUDIENCE=https://api.veripay`
5. `npm run dev`, open `http://localhost:5173`, click **Log in**.

## Testing

Auth0 is never called from the test suite. `apps/api/src/auth/__fixtures__/tokens.ts`
generates a real RS256 keypair in-process and exposes it as a local JWKS, so the
verifier runs its genuine signature path offline. Covered: valid token, missing
token, malformed header, invalid issuer, invalid audience, expired token,
foreign signing key, HS256 confusion, and a token with no `sub`.
