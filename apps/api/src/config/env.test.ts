import { describe, expect, it } from 'vitest';

import { DEFAULT_API_PORT, EnvironmentError, isProduction, loadEnv } from './env.js';

describe('loadEnv', () => {
  it('applies development-safe defaults with no input at all', () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.API_PORT).toBe(DEFAULT_API_PORT);
    expect(env.API_PORT).toBe(8787);
    expect(env.WEB_ORIGIN).toEqual(['http://localhost:5173']);
    expect(env.API_BASE_URL).toBe('http://localhost:8787');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('coerces API_PORT from a string', () => {
    expect(loadEnv({ API_PORT: '9001' }).API_PORT).toBe(9001);
  });

  it('rejects an out-of-range port', () => {
    expect(() => loadEnv({ API_PORT: '70000' })).toThrow(EnvironmentError);
    expect(() => loadEnv({ API_PORT: '0' })).toThrow(EnvironmentError);
  });

  it('rejects a non-numeric port', () => {
    expect(() => loadEnv({ API_PORT: 'not-a-port' })).toThrow(EnvironmentError);
  });

  it('reports problems in a readable form', () => {
    let message = '';
    try {
      loadEnv({ NODE_ENV: 'staging' });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('Invalid environment configuration');
    expect(message).toContain('NODE_ENV');
  });

  it('splits WEB_ORIGIN into a trimmed allowlist', () => {
    const env = loadEnv({ WEB_ORIGIN: 'http://localhost:5173, https://app.veripay.test ' });
    expect(env.WEB_ORIGIN).toEqual(['http://localhost:5173', 'https://app.veripay.test']);
  });

  it('rejects an origin that is not an absolute URL', () => {
    expect(() => loadEnv({ WEB_ORIGIN: 'localhost:5173' })).toThrow(EnvironmentError);
  });

  it('leaves integration variables optional while their features do not exist', () => {
    const env = loadEnv({});
    expect(env.SUPABASE_POOLER_URL).toBeUndefined();
    expect(env.AUTH0_DOMAIN).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
    expect(env.STRIPE_WEBHOOK_SECRET).toBeUndefined();
  });

  it('still validates optional variables when they are supplied', () => {
    expect(() => loadEnv({ STRIPE_CONNECT_RETURN_URL: 'not-a-url' })).toThrow(EnvironmentError);
    // A short hashing secret is worse than none, so the length floor applies.
    expect(() => loadEnv({ TOKEN_HASH_SECRET: 'too-short' })).toThrow(EnvironmentError);
  });

  it('never reads process.env unless asked to', () => {
    // Passing an explicit source is what makes every other test hermetic.
    expect(loadEnv({ API_PORT: '1234' }).API_PORT).toBe(1234);
  });

  it('identifies production', () => {
    expect(isProduction(loadEnv({ NODE_ENV: 'production' }))).toBe(true);
    expect(isProduction(loadEnv({ NODE_ENV: 'development' }))).toBe(false);
  });
});
