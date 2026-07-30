import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ERROR_CODES,
  ForbiddenError,
  HTTP_STATUS_BY_ERROR_CODE,
  InternalError,
  NotFoundError,
  PayloadTooLargeError,
  UnauthenticatedError,
  UpstreamUnavailableError,
  ValidationError,
  isAppError,
  toAppError,
} from './errors.js';

describe('AppError hierarchy', () => {
  it('maps each subclass to its code and HTTP status', () => {
    const cases = [
      [new ValidationError(), ERROR_CODES.VALIDATION_FAILED, 400],
      [new UnauthenticatedError(), ERROR_CODES.UNAUTHENTICATED, 401],
      [new ForbiddenError(), ERROR_CODES.FORBIDDEN, 403],
      [new NotFoundError(), ERROR_CODES.NOT_FOUND, 404],
      [new ConflictError(), ERROR_CODES.CONFLICT, 409],
      [new PayloadTooLargeError(), ERROR_CODES.PAYLOAD_TOO_LARGE, 413],
      [new UpstreamUnavailableError(), ERROR_CODES.UPSTREAM_UNAVAILABLE, 502],
      [new InternalError(), ERROR_CODES.INTERNAL_ERROR, 500],
    ] as const;

    for (const [error, code, status] of cases) {
      expect(error.code).toBe(code);
      expect(error.httpStatus).toBe(status);
    }
  });

  it('keeps instanceof working across the hierarchy', () => {
    const error = new NotFoundError('Deal not found');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(isAppError(error)).toBe(true);
  });

  it('names itself after the concrete subclass', () => {
    expect(new ConflictError().name).toBe('ConflictError');
  });

  it('carries details and cause', () => {
    const cause = new Error('underlying');
    const error = new ValidationError('bad input', { details: { field: 'amount' }, cause });
    expect(error.details).toEqual({ field: 'amount' });
    expect(error.cause).toBe(cause);
  });

  it('covers every declared error code', () => {
    for (const code of Object.values(ERROR_CODES)) {
      expect(HTTP_STATUS_BY_ERROR_CODE[code]).toBeTypeOf('number');
    }
  });
});

describe('toAppError', () => {
  it('passes an AppError through untouched', () => {
    const original = new ForbiddenError();
    expect(toAppError(original)).toBe(original);
  });

  it('wraps a plain Error as an internal fault and keeps the cause', () => {
    const original = new Error('database exploded');
    const wrapped = toAppError(original);
    expect(wrapped).toBeInstanceOf(InternalError);
    expect(wrapped.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(wrapped.cause).toBe(original);
  });

  it('wraps a non-Error throw without leaking its shape into the message', () => {
    const wrapped = toAppError({ secret: 'do not surface this' });
    expect(wrapped).toBeInstanceOf(InternalError);
    expect(wrapped.message).toBe('Internal server error');
  });

  it('reports isAppError false for unrelated values', () => {
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError('nope')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
