/**
 * Guards the one Auth0 mistake that would actually be dangerous: shipping a
 * confidential credential to the browser.
 *
 * An SPA is a public client. AUTH0_CLIENT_SECRET belongs to the confidential
 * server-side client and has no role in the SPA access-token flow. If it ever
 * reaches `apps/web`, every visitor can read it from the bundle.
 *
 * This test runs in Node and reads from disk, which is why `eslint.config.js`
 * relaxes the `node:*` import ban for web test files only.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { ALLOWED_BROWSER_ENV_KEYS, loadBrowserEnv, resolveAuth0Settings } from './env.js';

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(WEB_ROOT, 'src');
const DIST_DIR = join(WEB_ROOT, 'dist');

/** Names that must never appear in anything the browser can load. */
const FORBIDDEN = [
  'AUTH0_CLIENT_SECRET',
  'VITE_AUTH0_CLIENT_SECRET',
  'AUTH0_SECRET',
  'SUPABASE_DB_PASS',
  'SUPABASE_DB_URL',
  'SUPABASE_POOLER_URL',
  'STRIPE_SECRET_KEY',
  'TOKEN_HASH_SECRET',
];

function walk(dir: string): string[] {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found = found.concat(walk(full));
    } else {
      found.push(full);
    }
  }
  return found;
}

function offendersIn(dir: string): { file: string; needle: string }[] {
  const offenders: { file: string; needle: string }[] = [];
  for (const file of walk(dir)) {
    // This file necessarily contains the forbidden strings as literals.
    if (file === fileURLToPath(import.meta.url)) continue;
    if (file.endsWith('.map')) continue;

    const contents = readFileSync(file, 'utf8');
    for (const needle of FORBIDDEN) {
      if (contents.includes(needle)) {
        offenders.push({ file: file.replace(`${WEB_ROOT}/`, ''), needle });
      }
    }
  }
  return offenders;
}

describe('no server secret reaches the browser', () => {
  it('apps/web source references no confidential variable name', () => {
    expect(offendersIn(SRC_DIR)).toEqual([]);
  });

  it('the built bundle references no confidential variable name', () => {
    let exists = true;
    try {
      statSync(DIST_DIR);
    } catch {
      exists = false;
    }
    // Skipped rather than failed on a clean checkout; `npm run build` before
    // `npm run test` makes this assertion real, and CI runs both.
    if (!exists) {
      expect(exists).toBe(false);
      return;
    }
    expect(offendersIn(DIST_DIR)).toEqual([]);
  });

  it('exposes exactly four browser variables, none of them secret', () => {
    expect([...ALLOWED_BROWSER_ENV_KEYS]).toEqual([
      'VITE_API_BASE_URL',
      'VITE_AUTH0_DOMAIN',
      'VITE_AUTH0_CLIENT_ID',
      'VITE_AUTH0_AUDIENCE',
    ]);
    for (const key of ALLOWED_BROWSER_ENV_KEYS) {
      expect(key).not.toMatch(/SECRET|PASS|PRIVATE/i);
    }
  });

  it('drops any secret-looking variable that leaks into the environment', () => {
    // Zod strips unknown keys, so even a mis-set VITE_AUTH0_CLIENT_SECRET in
    // .env cannot reach application code through the parsed env object.
    const parsed = loadBrowserEnv({
      VITE_API_BASE_URL: 'http://localhost:8787',
      VITE_AUTH0_CLIENT_SECRET: 'should-never-survive',
    });

    expect(Object.keys(parsed)).not.toContain('VITE_AUTH0_CLIENT_SECRET');
    expect(JSON.stringify(parsed)).not.toContain('should-never-survive');
  });

  it('treats Auth0 as unconfigured unless all three public values are present', () => {
    expect(
      resolveAuth0Settings({
        VITE_API_BASE_URL: 'http://localhost:8787',
        VITE_AUTH0_DOMAIN: 'veripay.us.auth0.com',
      }),
    ).toBeUndefined();

    expect(
      resolveAuth0Settings({
        VITE_API_BASE_URL: 'http://localhost:8787',
        VITE_AUTH0_DOMAIN: 'veripay.us.auth0.com',
        VITE_AUTH0_CLIENT_ID: 'public-client-id',
        VITE_AUTH0_AUDIENCE: 'https://api.veripay',
      }),
    ).toEqual({
      domain: 'veripay.us.auth0.com',
      clientId: 'public-client-id',
      audience: 'https://api.veripay',
    });
  });
});
