import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { type RuntimeDatabaseConfig } from './config.js';
import * as schema from './schema/index.js';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
  readonly db: Database;
  /**
   * Drains the connection pool. Register this with the API's shutdown
   * coordinator so in-flight queries finish before the process exits.
   */
  close(): Promise<void>;
}

/** Seconds `close()` waits for in-flight queries before forcing the pool shut. */
const CLOSE_TIMEOUT_SECONDS = 5;

/**
 * Builds a Drizzle client over a bounded postgres.js pool.
 *
 * Call this once per process. Creating a client per request would exhaust the
 * pooler's connection budget.
 */
export function createDatabaseClient(config: RuntimeDatabaseConfig): DatabaseClient {
  const sql = postgres(config.url, {
    max: config.poolMax,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
    // REQUIRED for Supabase's Supavisor transaction pooler (port 6543):
    // consecutive statements are not guaranteed to hit the same backend, so a
    // prepared statement created on one connection will not exist on the next.
    prepare: !config.usesTransactionPooler,
    // Supabase terminates TLS at the pooler; the CA is not in the local trust
    // store, so verification is relaxed while the transport stays encrypted.
    ssl: 'require',
    onnotice: () => {
      // Supabase emits routine NOTICEs that would otherwise reach stdout
      // unstructured. Real diagnostics go through the API's pino logger.
    },
  });

  const db = drizzle(sql, { schema, casing: 'snake_case' });

  return {
    db,
    async close(): Promise<void> {
      await sql.end({ timeout: CLOSE_TIMEOUT_SECONDS });
    },
  };
}
