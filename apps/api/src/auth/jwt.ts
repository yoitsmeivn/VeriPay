/**
 * Auth0 access-token verification.
 *
 * VeriPay is a browser SPA talking to this API with bearer access tokens.
 * Verification is therefore asymmetric and public-key only: Auth0 signs with
 * RS256, we fetch the matching public key from the tenant's JWKS endpoint.
 *
 * AUTH0_CLIENT_SECRET plays no part in this. It is a confidential-client
 * credential; an SPA has no confidential credentials, and using it here would
 * imply an HMAC verification path that must never exist.
 */

import {
  type JWTPayload,
  type JWTVerifyGetKey,
  createRemoteJWKSet,
  errors as joseErrors,
  jwtVerify,
} from 'jose';

import { type AuthPrincipal, UnauthenticatedError, authPrincipalSchema } from '@veripay/shared';

import { type Env } from '../config/env.js';

/** The only signing algorithm VeriPay accepts. */
export const ACCEPTED_ALGORITHMS = ['RS256'] as const;

export interface AuthConfig {
  /** Auth0 tenant domain, e.g. `veripay.us.auth0.com`. No scheme. */
  readonly domain: string;
  /** API identifier configured in the Auth0 dashboard, e.g. `https://api.veripay`. */
  readonly audience: string;
}

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigError';
    Object.setPrototypeOf(this, AuthConfigError.prototype);
  }
}

/**
 * Extracts the Auth0 settings the verifier needs.
 *
 * Both variables are optional in the API's own env schema so the process can
 * boot for tooling and tests. This function is the hard gate: a verifier — and
 * therefore any protected route — cannot exist without real values.
 *
 * @throws {AuthConfigError} when either variable is missing.
 */
export function parseAuthConfig(env: Env): AuthConfig {
  const missing: string[] = [];
  if (env.AUTH0_DOMAIN === undefined || env.AUTH0_DOMAIN.trim() === '') {
    missing.push('AUTH0_DOMAIN');
  }
  if (env.AUTH0_AUDIENCE === undefined || env.AUTH0_AUDIENCE.trim() === '') {
    missing.push('AUTH0_AUDIENCE');
  }
  if (missing.length > 0) {
    throw new AuthConfigError(
      `Auth0 is not configured: ${missing.join(', ')} must be set to verify access tokens. ` +
        'AUTH0_DOMAIN comes from Stripe Projects; AUTH0_AUDIENCE is the API identifier you ' +
        'created in the Auth0 dashboard (see docs/auth0.md).',
    );
  }

  return {
    // Tolerate a pasted https:// prefix or trailing slash.
    domain: (env.AUTH0_DOMAIN ?? '')
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, ''),
    audience: (env.AUTH0_AUDIENCE ?? '').trim(),
  };
}

/** Auth0's `iss` claim is the tenant URL *with* a trailing slash. */
export function issuerForDomain(domain: string): string {
  return `https://${domain}/`;
}

/**
 * Production key source: Auth0's JWKS endpoint.
 *
 * `createRemoteJWKSet` caches keys and rate-limits refetches internally, so
 * this is built once per process rather than per request.
 */
export function createJwksKeyResolver(domain: string): JWTVerifyGetKey {
  return createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks.json`));
}

export interface Authenticator {
  verify(token: string): Promise<AuthPrincipal>;
}

export interface CreateAuthenticatorOptions {
  readonly issuer: string;
  readonly audience: string;
  /**
   * Injected so tests can verify against a locally generated key set.
   * Nothing in the test suite reaches the network.
   */
  readonly keyResolver: JWTVerifyGetKey;
}

/** The `scope` claim is a space-delimited string; callers want a list. */
function parseScope(claim: unknown): string[] {
  if (typeof claim !== 'string') {
    return [];
  }
  return claim.split(' ').filter((entry) => entry.length > 0);
}

function toPrincipal(payload: JWTPayload): AuthPrincipal {
  if (typeof payload.sub !== 'string' || payload.sub === '') {
    throw new UnauthenticatedError('Access token has no subject claim');
  }

  // Auth0 puts profile claims on the ID token, not the access token. They are
  // read opportunistically here and every one of them stays optional.
  const parsed = authPrincipalSchema.safeParse({
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
    emailVerified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
    scope: parseScope(payload.scope),
  });

  if (!parsed.success) {
    // Only reachable if Auth0 sends a malformed profile claim; the token itself
    // is already cryptographically valid at this point.
    throw new UnauthenticatedError('Access token claims failed validation');
  }

  return parsed.data;
}

/**
 * Builds a token verifier.
 *
 * Every failure becomes an `UnauthenticatedError` so the shared error handler
 * renders a 401 in the standard envelope. jose's internals and the token itself
 * never reach the client.
 */
export function createAuthenticator(options: CreateAuthenticatorOptions): Authenticator {
  const { issuer, audience, keyResolver } = options;

  return {
    async verify(token: string): Promise<AuthPrincipal> {
      if (token.trim() === '') {
        throw new UnauthenticatedError('Access token is empty');
      }

      let payload: JWTPayload;
      try {
        // Pinning `algorithms` is what defeats `alg: none` and RS256/HS256
        // confusion: a token signed with anything else is rejected before its
        // signature is even considered.
        ({ payload } = await jwtVerify(token, keyResolver, {
          issuer,
          audience,
          algorithms: [...ACCEPTED_ALGORITHMS],
        }));
      } catch (error) {
        throw toUnauthenticated(error);
      }

      return toPrincipal(payload);
    },
  };
}

/** Maps a jose failure to a client-safe 401. */
function toUnauthenticated(error: unknown): UnauthenticatedError {
  if (error instanceof joseErrors.JWTExpired) {
    return new UnauthenticatedError('Access token has expired', { cause: error });
  }
  if (error instanceof joseErrors.JWTClaimValidationFailed) {
    // Covers issuer and audience mismatches, and `nbf` in the future.
    return new UnauthenticatedError(`Access token claim "${error.claim}" is not valid`, {
      cause: error,
    });
  }
  if (
    error instanceof joseErrors.JWSSignatureVerificationFailed ||
    error instanceof joseErrors.JWKSNoMatchingKey ||
    error instanceof joseErrors.JWKSMultipleMatchingKeys
  ) {
    return new UnauthenticatedError('Access token signature could not be verified', {
      cause: error,
    });
  }
  if (error instanceof joseErrors.JOSEAlgNotAllowed) {
    return new UnauthenticatedError('Access token uses an unsupported signing algorithm', {
      cause: error,
    });
  }
  if (error instanceof joseErrors.JWSInvalid || error instanceof joseErrors.JWTInvalid) {
    return new UnauthenticatedError('Access token is malformed', { cause: error });
  }
  return new UnauthenticatedError('Access token could not be verified', { cause: error });
}

/** Convenience wiring for `server.ts`. */
export function createAuthenticatorFromEnv(env: Env): Authenticator {
  const config = parseAuthConfig(env);
  return createAuthenticator({
    issuer: issuerForDomain(config.domain),
    audience: config.audience,
    keyResolver: createJwksKeyResolver(config.domain),
  });
}
