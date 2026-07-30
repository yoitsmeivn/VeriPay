import { z } from 'zod';

/** Must match the API's default port (see apps/api/src/config/env.ts). */
const DEFAULT_API_BASE_URL = 'http://localhost:8787';

/**
 * Browser environment.
 *
 * Only VITE_-prefixed variables exist here, and everything in this schema ships
 * to the browser in plain text. There is deliberately no browser-side Auth0
 * client-secret variable, and there never can be: an SPA is a public client
 * with no confidential credential. The Auth0 client secret stays server-side
 * and plays no part in the SPA access-token flow.
 *
 * (`no-secret-leak.test.ts` asserts that no confidential variable *name* even
 * appears in this directory, so refer to it in prose rather than by name.)
 */
const browserEnvSchema = z.object({
  VITE_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),

  // Optional on purpose. Stripe Projects generates AUTH0_DOMAIN and
  // AUTH0_CLIENT_ID, not VITE_-prefixed names, so these are copied across by
  // hand (see docs/auth0.md). Leaving them optional means `npm run build` and
  // the test suite work on a checkout with no Auth0 values, and the app renders
  // an explicit "not configured" notice instead of crashing at import time.
  VITE_AUTH0_DOMAIN: z.string().min(1).optional(),
  VITE_AUTH0_CLIENT_ID: z.string().min(1).optional(),
  VITE_AUTH0_AUDIENCE: z.string().min(1).optional(),
});

export type BrowserEnv = z.infer<typeof browserEnvSchema>;

/** The complete set of variables the browser bundle is allowed to read. */
export const ALLOWED_BROWSER_ENV_KEYS = [
  'VITE_API_BASE_URL',
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
] as const;

/**
 * Validates the build-time environment.
 *
 * Fails loudly rather than producing `undefined` fetch URLs at runtime, which
 * is a much harder failure to read.
 */
export function loadBrowserEnv(
  // Deliberately loose: this is a validator, so it accepts any record and
  // narrows it. Vite's own BASE_URL/MODE/DEV/PROD/SSR keys are simply stripped.
  source: Record<string, unknown> = import.meta.env,
): BrowserEnv {
  const parsed = browserEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid browser environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const browserEnv = loadBrowserEnv();

export interface Auth0Settings {
  readonly domain: string;
  readonly clientId: string;
  readonly audience: string;
}

/**
 * Auth0 settings, or `undefined` when the SPA has not been configured yet.
 *
 * All three are required together — a domain without an audience yields tokens
 * the API will reject, which is a worse failure than not offering login at all.
 */
export function resolveAuth0Settings(env: BrowserEnv = browserEnv): Auth0Settings | undefined {
  const { VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE } = env;
  if (
    VITE_AUTH0_DOMAIN === undefined ||
    VITE_AUTH0_CLIENT_ID === undefined ||
    VITE_AUTH0_AUDIENCE === undefined
  ) {
    return undefined;
  }
  return {
    domain: VITE_AUTH0_DOMAIN,
    clientId: VITE_AUTH0_CLIENT_ID,
    audience: VITE_AUTH0_AUDIENCE,
  };
}
