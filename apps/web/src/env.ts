import { z } from 'zod';

/** Must match the API's default port (see apps/api/src/config/env.ts). */
const DEFAULT_API_BASE_URL = 'http://localhost:8787';

const browserEnvSchema = z.object({
  VITE_API_BASE_URL: z.url().default(DEFAULT_API_BASE_URL),
});

export type BrowserEnv = z.infer<typeof browserEnvSchema>;

/**
 * Validates the build-time environment.
 *
 * Fails loudly at module load rather than producing `undefined` fetch URLs at
 * runtime, which is a much harder failure to read.
 */
export function loadBrowserEnv(source: ImportMetaEnv = import.meta.env): BrowserEnv {
  const parsed = browserEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(`Invalid browser environment:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const browserEnv = loadBrowserEnv();
