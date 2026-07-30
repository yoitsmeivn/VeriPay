/**
 * drizzle-kit configuration.
 *
 * Runs under the drizzle-kit CLI, outside the API process, so it loads the
 * repository-root .env itself and uses SUPABASE_DB_URL — the DIRECT
 * connection. DDL and migration advisory locks do not work reliably through
 * the transaction pooler.
 */

import { fileURLToPath } from 'node:url';

import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

import { parseMigrationDatabaseConfig } from './src/config.js';

loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const { url } = parseMigrationDatabaseConfig(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
