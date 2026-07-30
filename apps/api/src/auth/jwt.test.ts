import { UnauthenticatedError } from '@veripay/shared';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadEnv } from '../config/env.js';
import {
  TEST_AUDIENCE,
  TEST_DOMAIN,
  TEST_ISSUER,
  TEST_SUBJECT,
  type TestKeyring,
  createTestKeyring,
  signHs256Token,
} from './__fixtures__/tokens.js';
import {
  type Authenticator,
  ACCEPTED_ALGORITHMS,
  AuthConfigError,
  createAuthenticator,
  issuerForDomain,
  parseAuthConfig,
} from './jwt.js';

let keyring: TestKeyring;
let foreignKeyring: TestKeyring;
let authenticator: Authenticator;

beforeAll(async () => {
  keyring = await createTestKeyring();
  // A second keypair the verifier has never seen.
  foreignKeyring = await createTestKeyring();
  authenticator = createAuthenticator({
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    keyResolver: keyring.keyResolver,
  });
});

describe('parseAuthConfig', () => {
  it('accepts a fully configured environment', () => {
    const config = parseAuthConfig(
      loadEnv({ AUTH0_DOMAIN: TEST_DOMAIN, AUTH0_AUDIENCE: TEST_AUDIENCE }),
    );
    expect(config).toEqual({ domain: TEST_DOMAIN, audience: TEST_AUDIENCE });
  });

  it('throws when AUTH0_DOMAIN is missing', () => {
    expect(() => parseAuthConfig(loadEnv({ AUTH0_AUDIENCE: TEST_AUDIENCE }))).toThrow(
      AuthConfigError,
    );
    expect(() => parseAuthConfig(loadEnv({ AUTH0_AUDIENCE: TEST_AUDIENCE }))).toThrow(
      /AUTH0_DOMAIN/,
    );
  });

  it('throws when AUTH0_AUDIENCE is missing', () => {
    expect(() => parseAuthConfig(loadEnv({ AUTH0_DOMAIN: TEST_DOMAIN }))).toThrow(/AUTH0_AUDIENCE/);
  });

  it('names both when neither is set', () => {
    expect(() => parseAuthConfig(loadEnv({}))).toThrow(/AUTH0_DOMAIN, AUTH0_AUDIENCE/);
  });

  it('tolerates a pasted scheme or trailing slash on the domain', () => {
    const config = parseAuthConfig(
      loadEnv({ AUTH0_DOMAIN: `https://${TEST_DOMAIN}/`, AUTH0_AUDIENCE: TEST_AUDIENCE }),
    );
    expect(config.domain).toBe(TEST_DOMAIN);
  });

  it('builds the Auth0 issuer with its trailing slash', () => {
    expect(issuerForDomain(TEST_DOMAIN)).toBe(TEST_ISSUER);
  });

  it('never uses AUTH0_CLIENT_SECRET', () => {
    // An SPA has no confidential credential. The secret must play no part in
    // access-token verification, so config built with it present is identical.
    const withSecret = parseAuthConfig(
      loadEnv({
        AUTH0_DOMAIN: TEST_DOMAIN,
        AUTH0_AUDIENCE: TEST_AUDIENCE,
        AUTH0_CLIENT_SECRET: 'irrelevant-to-verification',
      }),
    );
    expect(withSecret).toEqual({ domain: TEST_DOMAIN, audience: TEST_AUDIENCE });
    expect(Object.keys(withSecret)).toEqual(['domain', 'audience']);
  });
});

describe('createAuthenticator', () => {
  it('only ever accepts RS256', () => {
    expect(ACCEPTED_ALGORITHMS).toEqual(['RS256']);
  });

  it('verifies a well-formed token and returns the principal', async () => {
    const token = await keyring.sign({ scope: 'openid profile email' });
    const principal = await authenticator.verify(token);

    expect(principal.sub).toBe(TEST_SUBJECT);
    expect(principal.scope).toEqual(['openid', 'profile', 'email']);
  });

  it('defaults scope to an empty list when the claim is absent', async () => {
    const principal = await authenticator.verify(await keyring.sign());
    expect(principal.scope).toEqual([]);
  });

  it('surfaces optional profile claims when Auth0 sends them', async () => {
    const token = await keyring.sign({
      extraClaims: { email: 'user@veripay.test', email_verified: true, name: 'Test User' },
    });
    const principal = await authenticator.verify(token);

    expect(principal.email).toBe('user@veripay.test');
    expect(principal.emailVerified).toBe(true);
    expect(principal.name).toBe('Test User');
  });

  it('rejects an invalid issuer', async () => {
    const token = await keyring.sign({ issuer: 'https://attacker.example.com/' });
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticator.verify(token)).rejects.toThrow(/iss/);
  });

  it('rejects an invalid audience', async () => {
    const token = await keyring.sign({ audience: 'https://api.someone-else' });
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticator.verify(token)).rejects.toThrow(/aud/);
  });

  it('rejects an expired token', async () => {
    const token = await keyring.sign({ expiresInSeconds: -60 });
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticator.verify(token)).rejects.toThrow(/expired/i);
  });

  it('rejects a token signed by a key the tenant does not publish', async () => {
    const token = await foreignKeyring.sign();
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects an HS256 token — algorithm confusion', async () => {
    const token = await signHs256Token();
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rejects a token with no subject claim', async () => {
    const token = await keyring.sign({ subject: null });
    await expect(authenticator.verify(token)).rejects.toThrow(/subject/i);
  });

  it.each([
    ['empty string', ''],
    ['whitespace', '   '],
    ['not a JWT', 'nonsense'],
    ['two segments', 'aaa.bbb'],
    ['garbage segments', 'aaa.bbb.ccc'],
  ])('rejects a malformed token (%s)', async (_label, token) => {
    await expect(authenticator.verify(token)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('never leaks the token or jose internals in the error message', async () => {
    const token = await keyring.sign({ expiresInSeconds: -60 });
    const error = await authenticator.verify(token).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(UnauthenticatedError);
    const message = (error as Error).message;
    expect(message).not.toContain(token);
    expect(message).not.toMatch(/jose|JWKS|signature verification failed/i);
  });
});
