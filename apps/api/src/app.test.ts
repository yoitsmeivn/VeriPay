import {
  ERROR_CODES,
  apiFailureSchema,
  healthResponseSchema,
  meResponseSchema,
} from '@veripay/shared';
import { pino } from 'pino';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import {
  TEST_AUDIENCE,
  TEST_ISSUER,
  TEST_SUBJECT,
  type TestKeyring,
  createTestKeyring,
} from './auth/__fixtures__/tokens.js';
import { createAuthenticator } from './auth/jwt.js';
import { type Env, loadEnv } from './config/env.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const DISALLOWED_ORIGIN = 'http://evil.test';

let keyring: TestKeyring;

beforeAll(async () => {
  keyring = await createTestKeyring();
});

function buildApp(overrides: Record<string, string | undefined> = {}) {
  const env: Env = loadEnv({
    NODE_ENV: 'test',
    WEB_ORIGIN: ALLOWED_ORIGIN,
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  // Real verifier, local key set — no network, no Auth0.
  const authenticator = createAuthenticator({
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    keyResolver: keyring.keyResolver,
  });
  return createApp({
    env,
    logger: pino({ level: 'silent' }),
    authenticator,
    version: '0.1.0-test',
  });
}

describe('GET /api/health', () => {
  it('returns 200 with a payload matching the shared contract', async () => {
    const response = await request(buildApp()).get('/api/health');

    expect(response.status).toBe(200);
    // Parsing with the shared schema is the contract test: if the route and
    // the schema drift apart, this fails.
    const parsed = healthResponseSchema.safeParse(response.body);
    expect(parsed.success).toBe(true);
    expect(response.body.ok).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('veripay-api');
    expect(response.body.data.version).toBe('0.1.0-test');
  });

  it('does not leak the Express fingerprint', async () => {
    const response = await request(buildApp()).get('/api/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('stays public — no Authorization header required', async () => {
    // Uptime checks and the web app's status panel call this anonymously.
    const response = await request(buildApp()).get('/api/health');
    expect(response.status).toBe(200);
  });

  it('ignores a bearer token rather than rejecting it', async () => {
    const response = await request(buildApp())
      .get('/api/health')
      .set('Authorization', 'Bearer completely-invalid');
    expect(response.status).toBe(200);
  });
});

describe('GET /api/me', () => {
  it('requires authentication', async () => {
    const response = await request(buildApp()).get('/api/me');

    expect(response.status).toBe(401);
    expect(apiFailureSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHENTICATED);
  });

  it.each([
    ['no scheme', 'abc.def.ghi'],
    ['wrong scheme', 'Basic dXNlcjpwYXNz'],
    ['scheme only', 'Bearer'],
    ['garbage token', 'Bearer not-a-jwt'],
    ['too many parts', 'Bearer abc.def.ghi extra'],
  ])('rejects a malformed Authorization header (%s)', async (_label, header) => {
    const response = await request(buildApp()).get('/api/me').set('Authorization', header);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHENTICATED);
  });

  it('rejects an expired token', async () => {
    const token = await keyring.sign({ expiresInSeconds: -60 });
    const response = await request(buildApp())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error.message).toMatch(/expired/i);
  });

  it('rejects a token for a different audience', async () => {
    const token = await keyring.sign({ audience: 'https://api.someone-else' });
    const response = await request(buildApp())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('returns the verified principal for a valid token', async () => {
    const token = await keyring.sign({ scope: 'openid profile' });
    const response = await request(buildApp())
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(meResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data.sub).toBe(TEST_SUBJECT);
    expect(response.body.data.scope).toEqual(['openid', 'profile']);
  });

  it('carries the request id on the 401 and leaks neither the token nor internals', async () => {
    const token = await keyring.sign({ expiresInSeconds: -60 });
    const response = await request(buildApp())
      .get('/api/me')
      .set('x-request-id', 'trace-auth-001')
      .set('Authorization', `Bearer ${token}`);

    expect(response.body.error.requestId).toBe('trace-auth-001');
    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toContain(token);
    expect(serialised).not.toMatch(/jose|JWKS|stack/i);
  });
});

describe('security headers', () => {
  let headers: Record<string, string>;

  beforeAll(async () => {
    const response = await request(buildApp()).get('/api/health');
    headers = response.headers;
  });

  it('sets helmet defaults without breaking the endpoint', () => {
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });

  it('relaxes cross-origin-resource-policy so CORS governs access', () => {
    // The `same-origin` default would block the web app on :5173 outright.
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

describe('CORS', () => {
  it('allows a preflight from an allowlisted origin', async () => {
    const response = await request(buildApp())
      .options('/api/health')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('withholds the allow-origin header from an unknown origin', async () => {
    const response = await request(buildApp())
      .options('/api/health')
      .set('Origin', DISALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('never advertises credentials support', async () => {
    // Auth is bearer-token based; enabling credentials would widen CSRF
    // exposure for no benefit.
    const response = await request(buildApp())
      .options('/api/health')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('does not let helmet strip the CORS headers', async () => {
    const response = await request(buildApp()).get('/api/health').set('Origin', ALLOWED_ORIGIN);

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('honours a multi-origin allowlist', async () => {
    const app = buildApp({ WEB_ORIGIN: `${ALLOWED_ORIGIN},https://app.veripay.test` });
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://app.veripay.test');

    expect(response.headers['access-control-allow-origin']).toBe('https://app.veripay.test');
  });
});

describe('request ids', () => {
  it('generates one when the client sends none', async () => {
    const response = await request(buildApp()).get('/api/health');
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a well-formed client-supplied id', async () => {
    const supplied = 'trace-abc-123456';
    const response = await request(buildApp()).get('/api/health').set('x-request-id', supplied);
    expect(response.headers['x-request-id']).toBe(supplied);
  });

  it.each([
    ['too short', 'abc'],
    ['contains spaces', 'id with spaces'],
    ['contains delimiters', 'id";DROP TABLE deals;--'],
    ['absurdly long', 'x'.repeat(500)],
  ])('replaces a malformed id (%s) rather than trusting it', async (_label, hostile) => {
    const response = await request(buildApp()).get('/api/health').set('x-request-id', hostile);
    expect(response.headers['x-request-id']).not.toBe(hostile);
    expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('reports the id in error envelopes', async () => {
    const response = await request(buildApp()).get('/api/nope').set('x-request-id', 'trace-err-01');
    expect(response.body.error.requestId).toBe('trace-err-01');
  });
});

describe('error envelope', () => {
  it('returns a typed 404 for an unknown route', async () => {
    const response = await request(buildApp()).get('/api/nope');

    expect(response.status).toBe(404);
    expect(apiFailureSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.ok).toBe(false);
    expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('returns a typed 404 outside the /api prefix too', async () => {
    const response = await request(buildApp()).get('/');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('rejects an oversized JSON body with 413', async () => {
    const oversized = { blob: 'x'.repeat(200 * 1024) };
    const response = await request(buildApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(oversized);

    expect(response.status).toBe(413);
    expect(apiFailureSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.error.code).toBe(ERROR_CODES.PAYLOAD_TOO_LARGE);
  });

  it('rejects malformed JSON with a typed validation error', async () => {
    const response = await request(buildApp())
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"unbalanced":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
});
