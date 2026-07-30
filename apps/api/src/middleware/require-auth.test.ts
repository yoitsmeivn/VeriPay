import { UnauthenticatedError } from '@veripay/shared';
import { type Request } from 'express';
import { describe, expect, it } from 'vitest';

import { extractBearerToken, requirePrincipal } from './require-auth.js';

describe('extractBearerToken', () => {
  it('accepts a well-formed header', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('matches the scheme case-insensitively, per RFC 6750', () => {
    expect(extractBearerToken('bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('BEARER abc.def.ghi')).toBe('abc.def.ghi');
  });

  it('tolerates surrounding and repeated whitespace', () => {
    expect(extractBearerToken('  Bearer   abc.def.ghi  ')).toBe('abc.def.ghi');
  });

  it.each([
    ['missing header', undefined],
    ['empty header', ''],
    ['whitespace only', '   '],
    ['scheme with no token', 'Bearer'],
    ['scheme with trailing space only', 'Bearer '],
    ['wrong scheme', 'Basic dXNlcjpwYXNz'],
    ['token with no scheme', 'abc.def.ghi'],
    ['too many parts', 'Bearer abc.def.ghi extra'],
  ])('rejects %s', (_label, header) => {
    expect(() => extractBearerToken(header)).toThrow(UnauthenticatedError);
  });

  it('explains what the header should look like', () => {
    expect(() => extractBearerToken('Bearer a b')).toThrow(/Bearer <token>/);
    expect(() => extractBearerToken('Basic xyz')).toThrow(/scheme must be Bearer/);
    expect(() => extractBearerToken(undefined)).toThrow(/Missing Authorization header/);
  });
});

describe('requirePrincipal', () => {
  it('returns the principal attached by requireAuth', () => {
    const req = { auth: { sub: 'auth0|123', scope: [] } } as unknown as Request;
    expect(requirePrincipal(req).sub).toBe('auth0|123');
  });

  it('fails closed when the route forgot requireAuth', () => {
    // The whole point: a handler that is not actually protected must throw
    // rather than quietly serve an anonymous caller.
    const req = {} as unknown as Request;
    expect(() => requirePrincipal(req)).toThrow(UnauthenticatedError);
  });
});
