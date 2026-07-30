// Shared ESLint flat-config building blocks for the VeriPay monorepo.
//
// This module only exposes reusable pieces. The repository root composes them
// with workspace-specific overrides in `eslint.config.js`.

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettierCompat from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Paths no linter should ever walk. */
export const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.vite/**',
  '**/*.tsbuildinfo',
  // Stripe Projects working directory: generated state, cache and vault.
  '.projects/**',
  // Drizzle-generated SQL and journal files.
  'packages/database/drizzle/**',
];

/**
 * `eslint-config-prettier` disables every stylistic rule that would fight
 * Prettier. It must always be spread LAST in the final config array.
 */
export const prettierOverrides = prettierCompat;

/**
 * Type-aware TypeScript base shared by every workspace.
 *
 * @param {string} tsconfigRootDir Absolute path to the repository root.
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function typescriptBase(tsconfigRootDir) {
  return defineConfig(
    js.configs.recommended,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    {
      name: 'veripay/base',
      languageOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
        parserOptions: {
          // `projectService` lets typescript-eslint discover the nearest
          // tsconfig per file, including files (tests, config) that are not
          // part of a build project.
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        eqeqeq: ['error', 'always', { null: 'ignore' }],
        'no-console': 'error',
        'object-shorthand': 'error',
        'prefer-const': ['error', { destructuring: 'all' }],
        '@typescript-eslint/consistent-type-imports': [
          'error',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        // Exhaustiveness is how we keep union handling honest as the domain grows.
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
      },
    },
  );
}

/**
 * Rules for browser/React source files.
 *
 * @param {string[]} files Glob patterns the preset applies to.
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function reactPreset(files) {
  return defineConfig(
    { ...reactHooks.configs.flat.recommended, files, name: 'veripay/react-hooks' },
    { ...reactRefresh.configs.vite, files, name: 'veripay/react-refresh' },
    {
      name: 'veripay/react-globals',
      files,
      languageOptions: { globals: globals.browser },
    },
  );
}

/**
 * Rules for Node.js source files.
 *
 * @param {string[]} files Glob patterns the preset applies to.
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function nodePreset(files) {
  return defineConfig({
    name: 'veripay/node-globals',
    files,
    languageOptions: { globals: globals.node },
  });
}

/**
 * Plain JavaScript files (config files, this file) cannot be type-checked
 * against a tsconfig, so type-aware rules are switched off for them.
 *
 * @param {string[]} files Glob patterns the preset applies to.
 * @returns {import('typescript-eslint').ConfigArray}
 */
export function untypedJavaScriptPreset(files) {
  return defineConfig({
    ...tseslint.configs.disableTypeChecked,
    name: 'veripay/untyped-js',
    files,
    languageOptions: { globals: globals.node },
  });
}
