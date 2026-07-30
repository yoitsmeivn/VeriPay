/**
 * Typed application errors shared by the API and the browser client.
 *
 * Every failure that crosses the HTTP boundary is described by one of these
 * codes, so the frontend can branch on `code` instead of parsing messages.
 */

export const ERROR_CODES = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** Default HTTP status for each error code. */
export const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  [ERROR_CODES.VALIDATION_FAILED]: 400,
  [ERROR_CODES.UNAUTHENTICATED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 413,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.UPSTREAM_UNAVAILABLE]: 502,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

export interface AppErrorOptions {
  /** Safe, client-visible context. Never put secrets or PII here. */
  readonly details?: unknown;
  readonly cause?: unknown;
}

/**
 * Base class for every error VeriPay raises deliberately.
 *
 * Anything that is *not* an `AppError` is treated as an unexpected internal
 * fault and is never echoed back to the client verbatim.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = code;
    this.httpStatus = HTTP_STATUS_BY_ERROR_CODE[code];
    this.details = options.details;
    // Keeps `instanceof` working for subclasses across compile targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', options?: AppErrorOptions) {
    super(ERROR_CODES.VALIDATION_FAILED, message, options);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required', options?: AppErrorOptions) {
    super(ERROR_CODES.UNAUTHENTICATED, message, options);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Not permitted', options?: AppErrorOptions) {
    super(ERROR_CODES.FORBIDDEN, message, options);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', options?: AppErrorOptions) {
    super(ERROR_CODES.NOT_FOUND, message, options);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflicting state', options?: AppErrorOptions) {
    super(ERROR_CODES.CONFLICT, message, options);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request body too large', options?: AppErrorOptions) {
    super(ERROR_CODES.PAYLOAD_TOO_LARGE, message, options);
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor(message = 'Upstream service unavailable', options?: AppErrorOptions) {
    super(ERROR_CODES.UPSTREAM_UNAVAILABLE, message, options);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', options?: AppErrorOptions) {
    super(ERROR_CODES.INTERNAL_ERROR, message, options);
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}

/**
 * Normalises an unknown thrown value into an `AppError`.
 *
 * Transport-specific mapping (Express body-parser codes, `fetch` failures)
 * belongs in the layer that owns that transport; this handles only the
 * isomorphic cases and the safe fallback.
 */
export function toAppError(value: unknown): AppError {
  if (isAppError(value)) {
    return value;
  }
  if (value instanceof Error) {
    return new InternalError(value.message, { cause: value });
  }
  return new InternalError('Internal server error', { cause: value });
}
