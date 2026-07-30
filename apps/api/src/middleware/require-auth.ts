import { type AuthPrincipal, UnauthenticatedError } from '@veripay/shared';
import { type Request, type RequestHandler } from 'express';

import { type Authenticator } from '../auth/jwt.js';

// Mirrors how `request-id.ts` attaches `req.id`. Optional because it is only
// populated on routes that actually ran `requireAuth`; `requirePrincipal`
// below turns that optional into a guaranteed value for handlers.
declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth()`. Absent on public routes. */
    auth?: AuthPrincipal;
  }
}

/**
 * Pulls the token out of an `Authorization: Bearer <token>` header.
 *
 * The scheme is matched case-insensitively per RFC 6750, but the header must
 * be exactly two whitespace-separated parts — `Bearer a b` is rejected rather
 * than silently treating `a` as the token.
 */
export function extractBearerToken(header: string | undefined): string {
  if (header === undefined || header.trim() === '') {
    throw new UnauthenticatedError('Missing Authorization header');
  }

  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2) {
    throw new UnauthenticatedError('Authorization header must be "Bearer <token>"');
  }

  const [scheme, token] = parts;
  if (scheme?.toLowerCase() !== 'bearer') {
    throw new UnauthenticatedError('Authorization scheme must be Bearer');
  }
  if (token === undefined || token === '') {
    throw new UnauthenticatedError('Bearer token is empty');
  }

  return token;
}

/**
 * Requires a verified Auth0 access token.
 *
 * Attach to any route that must know who the caller is. Failures are thrown as
 * `UnauthenticatedError`, which the shared error handler renders as a 401 in
 * the standard envelope with the request id attached.
 */
export function requireAuth(authenticator: Authenticator): RequestHandler {
  return (req, _res, next) => {
    void (async () => {
      try {
        const token = extractBearerToken(req.get('authorization'));
        req.auth = await authenticator.verify(token);
        next();
      } catch (error) {
        next(error);
      }
    })();
  };
}

/**
 * Reads the authenticated principal.
 *
 * Throws rather than returning `undefined`, so a handler that forgot its
 * `requireAuth` fails closed instead of serving data to an anonymous caller.
 */
export function requirePrincipal(req: Request): AuthPrincipal {
  if (req.auth === undefined) {
    throw new UnauthenticatedError('Route requires authentication');
  }
  return req.auth;
}
