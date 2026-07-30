import {
  IGNORE_PATTERNS,
  nodePreset,
  prettierOverrides,
  reactPreset,
  typescriptBase,
  untypedJavaScriptPreset,
} from '@veripay/config/eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

const BACKEND_FILES = ['apps/api/**/*.ts', 'packages/**/*.ts'];
const WEB_FILES = ['apps/web/**/*.{ts,tsx}'];
const TEST_FILES = ['**/*.test.ts', '**/*.test.tsx'];

export default defineConfig(
  globalIgnores(IGNORE_PATTERNS),

  typescriptBase(import.meta.dirname),

  nodePreset(BACKEND_FILES),
  reactPreset(WEB_FILES),

  // ---------------------------------------------------------------------------
  // Architectural boundaries.
  //
  // These are not style preferences. They are the layering rules described in
  // AGENTS.md, enforced so a wrong import fails `npm run lint` instead of being
  // discovered at runtime.
  // ---------------------------------------------------------------------------
  {
    name: 'veripay/boundary-backend',
    files: BACKEND_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*'],
              message: 'Backend code must not import frontend modules.',
            },
            {
              group: ['**/apps/web/**', '@veripay/web'],
              message: 'Backend code must not import from apps/web.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'veripay/boundary-web',
    files: WEB_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@veripay/database', '@veripay/database/*'],
              message: 'The browser must never reach the database directly. Call the API instead.',
            },
            {
              group: ['express', 'express/*', 'pino', 'pino-http', 'postgres', 'drizzle-orm/*'],
              message: 'Server-only dependency. This module is bundled for the browser.',
            },
            {
              group: ['node:*'],
              message: 'Node built-ins are not available in the browser bundle.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'veripay/boundary-shared-isomorphic',
    files: ['packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'react', 'react-dom', 'express', 'express/*', 'postgres'],
              message:
                '@veripay/shared is imported by both the API and the browser, so it must stay isomorphic.',
            },
          ],
        },
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // Local relaxations.
  // ---------------------------------------------------------------------------
  {
    name: 'veripay/tests',
    files: TEST_FILES,
    rules: {
      // Tests assert on values the type system cannot narrow for them.
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
  {
    name: 'veripay/web-tests-node-access',
    // Web *tests* run in Node, and one of them scans the source tree and the
    // built bundle for leaked secrets — which needs `node:fs`. The boundary
    // rule still applies in full to apps/web application source.
    files: ['apps/web/**/*.test.ts', 'apps/web/**/*.test.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    name: 'veripay/entrypoints',
    // `server.ts` reports fatal startup failures before a logger can exist, and
    // drizzle.config.ts runs under the drizzle-kit CLI with no logger at all.
    files: ['apps/api/src/server.ts', 'packages/database/drizzle.config.ts'],
    rules: { 'no-console': 'off' },
  },

  untypedJavaScriptPreset(['**/*.js', '**/*.mjs', '**/*.cjs']),

  // Must stay last: turns off every rule Prettier already governs.
  prettierOverrides,
);
