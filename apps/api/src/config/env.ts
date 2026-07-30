/**
 * API environment validation.
 *
 * `loadEnv` is a pure function over an explicit source object so tests can
 * build an environment without touching `process.env`. Nothing in the app
 * reads `process.env` directly.
 */

import { z } from 'zod';

/** Default port for the local API. Keep in sync with docs and .env.example. */
export const DEFAULT_API_PORT = 8787;

/**
 * Canonicalises one CORS origin, or returns undefined if it is not one.
 *
 * `URL.canParse` is not sufficient here: it accepts `localhost:5173`, reading
 * `localhost:` as the scheme. An allowlist entry that silently parses into
 * something else would never match a real Origin header, so the shape is
 * checked explicitly — an http(s) scheme and nothing after the authority.
 */
function canonicalOrigin(value: string): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }
  // Browsers send scheme://host[:port] with no path, query or fragment.
  // A lone trailing slash is tolerated and normalised away.
  const withoutTrailingSlash = value.endsWith('/') ? value.slice(0, -1) : value;
  return parsed.origin === withoutTrailingSlash ? parsed.origin : undefined;
}

const originListSchema = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .refine((origins) => origins.length > 0, 'At least one origin is required')
  .refine(
    (origins) => origins.every((origin) => canonicalOrigin(origin) !== undefined),
    'Every origin must be an absolute http(s) origin with no path, e.g. http://localhost:5173',
  )
  .transform((origins) => origins.map((origin) => canonicalOrigin(origin) ?? origin));

const envSchema = z.object({
  // ---------------------------------------------------------------------------
  // Required to run. Defaults are development-safe, never production secrets.
  // ---------------------------------------------------------------------------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(DEFAULT_API_PORT),
  // `prefault` (not `default`) so the fallback is fed through the same
  // splitting and URL validation as a supplied value.
  WEB_ORIGIN: originListSchema.prefault('http://localhost:5173'),
  API_BASE_URL: z.url().default(`http://localhost:${String(DEFAULT_API_PORT)}`),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SHUTDOWN_GRACE_MS: z.coerce.number().int().min(0).default(10_000),

  // ---------------------------------------------------------------------------
  // Optional while the corresponding feature does not exist yet.
  //
  // Each becomes required at the milestone named below. Leaving them optional
  // is safe because the module that consumes each one validates it at the
  // point of use — @veripay/database's parseRuntimeDatabaseConfig hard-requires
  // SUPABASE_POOLER_URL before any client can be constructed, for example.
  // ---------------------------------------------------------------------------

  // TODO(persistence): required once the API instantiates a database client.
  SUPABASE_POOLER_URL: z.string().min(1).optional(),
  // TODO(persistence): required by drizzle-kit migrations only, never at runtime.
  SUPABASE_DB_URL: z.string().min(1).optional(),

  // Auth0. Optional here so tooling and tests can build an env without them;
  // `parseAuthConfig` in src/auth/jwt.ts hard-requires the two the verifier
  // needs, and server.ts refuses to start if they are missing.
  //
  // AUTH0_DOMAIN and AUTH0_CLIENT_ID come from Stripe Projects. AUTH0_AUDIENCE
  // does not — it is the API identifier you create by hand in the Auth0
  // dashboard (see docs/auth0.md).
  AUTH0_DOMAIN: z.string().min(1).optional(),
  AUTH0_AUDIENCE: z.string().min(1).optional(),
  AUTH0_CLIENT_ID: z.string().min(1).optional(),
  // Declared so a value in .env validates, but deliberately unused: the SPA
  // access-token flow is public-key only (RS256 + JWKS). Nothing in this API
  // reads it, and it must never reach the browser bundle.
  AUTH0_CLIENT_SECRET: z.string().min(1).optional(),

  // TODO(payments): required once Checkout and Connect endpoints land.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  // TODO(payments): required once the webhook endpoint lands. Payment state is
  // only ever advanced by a signature-verified webhook.
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_CONNECT_RETURN_URL: z.url().optional(),
  STRIPE_CONNECT_REFRESH_URL: z.url().optional(),

  // TODO(links): required once user-facing links are generated server-side.
  APP_BASE_URL: z.url().optional(),
  // TODO(tokens): required once opaque tokens are hashed before storage.
  TOKEN_HASH_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

export class EnvironmentError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'EnvironmentError';
    Object.setPrototypeOf(this, EnvironmentError.prototype);
  }
}

/**
 * Validates and normalises the environment.
 *
 * @throws {EnvironmentError} with a human-readable report of every problem.
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvironmentError(
      `Invalid environment configuration:\n${z.prettifyError(parsed.error)}`,
      { cause: parsed.error },
    );
  }
  return parsed.data;
}

export function isProduction(env: Env): boolean {
  return env.NODE_ENV === 'production';
}
