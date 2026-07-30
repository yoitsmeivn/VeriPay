/**
 * Database configuration.
 *
 * Supabase exposes this project through two different connections, and they
 * are NOT interchangeable:
 *
 *   SUPABASE_POOLER_URL (port 6543) — Supavisor transaction pooler. Every
 *     statement may land on a different backend, so prepared statements must
 *     be disabled. This is what a long-running API process should use.
 *
 *   SUPABASE_DB_URL (port 5432) — direct connection. Required for DDL and
 *     advisory locks, which is why drizzle-kit migrations use it.
 *
 * Both variables are provisioned by Stripe Projects. Reaching for the wrong
 * one produces failures that only show up under load or during a migration,
 * so each role gets its own parser rather than a single ambiguous config.
 */

import { z } from 'zod';

const POSTGRES_URL_PATTERN = /^postgres(?:ql)?:\/\//;

const postgresUrlSchema = z
  .string()
  .min(1)
  .regex(POSTGRES_URL_PATTERN, 'Must be a postgres:// or postgresql:// connection string');

/** Port Supabase uses for the Supavisor transaction pooler. */
export const SUPABASE_POOLER_PORT = 6543;
/** Port Supabase uses for direct connections. */
export const SUPABASE_DIRECT_PORT = 5432;

const runtimeEnvSchema = z.object({
  SUPABASE_POOLER_URL: postgresUrlSchema,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DATABASE_IDLE_TIMEOUT_SECONDS: z.coerce.number().int().min(1).default(30),
  DATABASE_CONNECT_TIMEOUT_SECONDS: z.coerce.number().int().min(1).default(10),
});

const migrationEnvSchema = z.object({
  SUPABASE_DB_URL: postgresUrlSchema,
});

export interface RuntimeDatabaseConfig {
  readonly url: string;
  readonly poolMax: number;
  readonly idleTimeoutSeconds: number;
  readonly connectTimeoutSeconds: number;
  /**
   * True when the URL points at the transaction pooler. Prepared statements
   * are disabled in that case.
   */
  readonly usesTransactionPooler: boolean;
}

export interface MigrationDatabaseConfig {
  readonly url: string;
}

export class DatabaseConfigError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseConfigError';
    Object.setPrototypeOf(this, DatabaseConfigError.prototype);
  }
}

function portOf(url: string): number | undefined {
  try {
    const parsed = new URL(url);
    return parsed.port === '' ? undefined : Number(parsed.port);
  } catch {
    return undefined;
  }
}

/**
 * Configuration for the long-running API runtime client.
 *
 * Hard-requires `SUPABASE_POOLER_URL`. The API's own env parser leaves the
 * Supabase variables optional while no database client is instantiated; this
 * function is the gate that makes that safe, because a client cannot be built
 * without a real pooler URL.
 */
export function parseRuntimeDatabaseConfig(
  source: Record<string, string | undefined>,
): RuntimeDatabaseConfig {
  const parsed = runtimeEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new DatabaseConfigError(
      `Invalid runtime database configuration. SUPABASE_POOLER_URL (port ${String(
        SUPABASE_POOLER_PORT,
      )}) is required to build a database client.\n${z.prettifyError(parsed.error)}`,
      { cause: parsed.error },
    );
  }

  const url = parsed.data.SUPABASE_POOLER_URL;
  const port = portOf(url);
  if (port === SUPABASE_DIRECT_PORT) {
    throw new DatabaseConfigError(
      `SUPABASE_POOLER_URL points at port ${String(SUPABASE_DIRECT_PORT)} (a direct connection). ` +
        `The runtime client expects the transaction pooler on port ${String(SUPABASE_POOLER_PORT)}.`,
    );
  }

  return {
    url,
    poolMax: parsed.data.DATABASE_POOL_MAX,
    idleTimeoutSeconds: parsed.data.DATABASE_IDLE_TIMEOUT_SECONDS,
    connectTimeoutSeconds: parsed.data.DATABASE_CONNECT_TIMEOUT_SECONDS,
    usesTransactionPooler: port === SUPABASE_POOLER_PORT,
  };
}

/**
 * Configuration for drizzle-kit migrations.
 *
 * Hard-requires `SUPABASE_DB_URL`, the direct connection. Running DDL through
 * the transaction pooler fails in ways that are painful to diagnose.
 */
export function parseMigrationDatabaseConfig(
  source: Record<string, string | undefined>,
): MigrationDatabaseConfig {
  const parsed = migrationEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new DatabaseConfigError(
      `Invalid migration database configuration. SUPABASE_DB_URL (direct connection, port ${String(
        SUPABASE_DIRECT_PORT,
      )}) is required to generate or apply migrations.\n${z.prettifyError(parsed.error)}`,
      { cause: parsed.error },
    );
  }

  const url = parsed.data.SUPABASE_DB_URL;
  if (portOf(url) === SUPABASE_POOLER_PORT) {
    throw new DatabaseConfigError(
      `SUPABASE_DB_URL points at the transaction pooler (port ${String(SUPABASE_POOLER_PORT)}). ` +
        `Migrations require the direct connection on port ${String(SUPABASE_DIRECT_PORT)}.`,
    );
  }

  return { url };
}
