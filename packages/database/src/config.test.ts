import { describe, expect, it } from 'vitest';

import {
  DatabaseConfigError,
  parseMigrationDatabaseConfig,
  parseRuntimeDatabaseConfig,
} from './config.js';

const POOLER_URL = 'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres';
const DIRECT_URL = 'postgresql://user:pass@db.example.supabase.co:5432/postgres';

describe('parseRuntimeDatabaseConfig', () => {
  it('requires SUPABASE_POOLER_URL', () => {
    expect(() => parseRuntimeDatabaseConfig({})).toThrow(DatabaseConfigError);
  });

  it('names the missing variable in the error', () => {
    expect(() => parseRuntimeDatabaseConfig({})).toThrow(/SUPABASE_POOLER_URL/);
  });

  it('does not accept SUPABASE_DB_URL as a substitute', () => {
    expect(() => parseRuntimeDatabaseConfig({ SUPABASE_DB_URL: DIRECT_URL })).toThrow(
      DatabaseConfigError,
    );
  });

  it('rejects a value that is not a postgres URL', () => {
    expect(() =>
      parseRuntimeDatabaseConfig({ SUPABASE_POOLER_URL: 'https://example.com' }),
    ).toThrow(DatabaseConfigError);
  });

  it('rejects a direct connection used as the runtime URL', () => {
    expect(() => parseRuntimeDatabaseConfig({ SUPABASE_POOLER_URL: DIRECT_URL })).toThrow(
      /transaction pooler/,
    );
  });

  it('applies bounded pool defaults', () => {
    const config = parseRuntimeDatabaseConfig({ SUPABASE_POOLER_URL: POOLER_URL });
    expect(config.url).toBe(POOLER_URL);
    expect(config.poolMax).toBe(10);
    expect(config.idleTimeoutSeconds).toBe(30);
    expect(config.connectTimeoutSeconds).toBe(10);
  });

  it('detects the transaction pooler so prepared statements get disabled', () => {
    const config = parseRuntimeDatabaseConfig({ SUPABASE_POOLER_URL: POOLER_URL });
    expect(config.usesTransactionPooler).toBe(true);
  });

  it('coerces numeric overrides from strings', () => {
    const config = parseRuntimeDatabaseConfig({
      SUPABASE_POOLER_URL: POOLER_URL,
      DATABASE_POOL_MAX: '25',
      DATABASE_IDLE_TIMEOUT_SECONDS: '60',
    });
    expect(config.poolMax).toBe(25);
    expect(config.idleTimeoutSeconds).toBe(60);
  });

  it('rejects an unbounded pool', () => {
    expect(() =>
      parseRuntimeDatabaseConfig({ SUPABASE_POOLER_URL: POOLER_URL, DATABASE_POOL_MAX: '0' }),
    ).toThrow(DatabaseConfigError);
  });
});

describe('parseMigrationDatabaseConfig', () => {
  it('requires SUPABASE_DB_URL', () => {
    expect(() => parseMigrationDatabaseConfig({})).toThrow(DatabaseConfigError);
    expect(() => parseMigrationDatabaseConfig({})).toThrow(/SUPABASE_DB_URL/);
  });

  it('does not accept SUPABASE_POOLER_URL as a substitute', () => {
    expect(() => parseMigrationDatabaseConfig({ SUPABASE_POOLER_URL: POOLER_URL })).toThrow(
      DatabaseConfigError,
    );
  });

  it('rejects the pooler URL, which cannot run DDL reliably', () => {
    expect(() => parseMigrationDatabaseConfig({ SUPABASE_DB_URL: POOLER_URL })).toThrow(
      /direct connection/,
    );
  });

  it('accepts the direct connection', () => {
    expect(parseMigrationDatabaseConfig({ SUPABASE_DB_URL: DIRECT_URL })).toEqual({
      url: DIRECT_URL,
    });
  });
});
