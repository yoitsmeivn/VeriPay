/**
 * Deterministic, fully offline token fixtures.
 *
 * A real RS256 keypair is generated in-process and exposed as a local JWKS, so
 * the verifier under test runs its genuine signature path without any network
 * call to Auth0. Nothing here is used outside tests — the directory is excluded
 * from tsconfig.build.json.
 */

import {
  type JWTVerifyGetKey,
  type JWK,
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
} from 'jose';

export const TEST_DOMAIN = 'veripay-test.us.auth0.com';
export const TEST_ISSUER = `https://${TEST_DOMAIN}/`;
export const TEST_AUDIENCE = 'https://api.veripay';
export const TEST_SUBJECT = 'auth0|000000000000000000000001';
const TEST_KID = 'veripay-test-key-1';

export interface TestKeyring {
  /** Feed this to `createAuthenticator` in place of the remote JWKS. */
  readonly keyResolver: JWTVerifyGetKey;
  /** A second, unrelated keyring's signer — for "signed by a foreign key" cases. */
  readonly sign: (options?: SignOptions) => Promise<string>;
  readonly publicJwk: JWK;
}

export interface SignOptions {
  readonly issuer?: string;
  readonly audience?: string;
  readonly subject?: string | null;
  readonly scope?: string;
  /** Seconds from now. Negative values produce an already-expired token. */
  readonly expiresInSeconds?: number;
  readonly extraClaims?: Record<string, unknown>;
}

export async function createTestKeyring(): Promise<TestKeyring> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });

  const publicJwk: JWK = {
    ...(await exportJWK(publicKey)),
    kid: TEST_KID,
    alg: 'RS256',
    use: 'sig',
  };
  const keyResolver = createLocalJWKSet({ keys: [publicJwk] });

  async function sign(options: SignOptions = {}): Promise<string> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiresInSeconds = options.expiresInSeconds ?? 300;

    const claims: Record<string, unknown> = { ...options.extraClaims };
    if (options.scope !== undefined) {
      claims.scope = options.scope;
    }

    let builder = new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: TEST_KID })
      .setIssuer(options.issuer ?? TEST_ISSUER)
      .setAudience(options.audience ?? TEST_AUDIENCE)
      .setIssuedAt(nowSeconds - 1)
      .setExpirationTime(nowSeconds + expiresInSeconds);

    // `null` means "mint a token with no sub", which is a case we must reject.
    const subject = options.subject === undefined ? TEST_SUBJECT : options.subject;
    if (subject !== null) {
      builder = builder.setSubject(subject);
    }

    return builder.sign(privateKey);
  }

  return { keyResolver, sign, publicJwk };
}

/**
 * A token signed with HS256 instead of RS256.
 *
 * Algorithm-confusion probe: a verifier that does not pin `algorithms` can be
 * tricked into treating a public key as an HMAC secret.
 */
export async function signHs256Token(secret = 'not-the-real-signing-key'): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TEST_ISSUER)
    .setAudience(TEST_AUDIENCE)
    .setSubject(TEST_SUBJECT)
    .setIssuedAt(nowSeconds - 1)
    .setExpirationTime(nowSeconds + 300)
    .sign(new TextEncoder().encode(secret));
}
