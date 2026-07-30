import {
  type AppError,
  ERROR_CODES,
  PayloadTooLargeError,
  ValidationError,
  apiFailure,
  isAppError,
  toAppError,
} from '@veripay/shared';
import { type ErrorRequestHandler } from 'express';
import { ZodError, z } from 'zod';

import { type Env, isProduction } from '../config/env.js';
import { type Logger } from '../lib/logger.js';

/**
 * Body-parser failures arrive as generic errors carrying a `type` discriminator
 * and an HTTP status. Narrowing structurally avoids importing body-parser's
 * internals just for a type.
 */
interface BodyParserError extends Error {
  readonly type?: string;
  readonly status?: number;
  readonly statusCode?: number;
}

function isBodyParserError(value: unknown): value is BodyParserError {
  return value instanceof Error && 'type' in value && typeof value.type === 'string';
}

/**
 * Maps transport-level failures onto the shared error vocabulary.
 *
 * `@veripay/shared` stays isomorphic and knows nothing about Express, so
 * Express-specific mapping lives here.
 */
function normalise(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError('Request validation failed', {
      details: z.treeifyError(error),
      cause: error,
    });
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return new PayloadTooLargeError('Request body exceeds the maximum allowed size', {
        cause: error,
      });
    }
    if (
      error.type === 'entity.parse.failed' ||
      error.type === 'encoding.unsupported' ||
      error.type === 'charset.unsupported'
    ) {
      return new ValidationError('Malformed request body', { cause: error });
    }
  }

  return toAppError(error);
}

/**
 * Terminal error handler.
 *
 * Must be registered last. Produces the `ApiFailure` envelope for every
 * failure and guarantees that unexpected internals are never echoed to a
 * client in production.
 */
export function errorHandler(env: Env, logger: Logger): ErrorRequestHandler {
  return (error, req, res, next) => {
    // Express cannot rewrite a response whose headers are already flushed;
    // hand it back so the default handler can destroy the socket.
    if (res.headersSent) {
      next(error);
      return;
    }

    const appError = normalise(error);
    const isServerFault = appError.httpStatus >= 500;

    const logPayload = { err: appError, requestId: req.id, code: appError.code };
    if (isServerFault) {
      logger.error(logPayload, 'request failed');
    } else {
      logger.warn(logPayload, 'request rejected');
    }

    // An unexpected 5xx message can carry stack details, SQL or secrets.
    const message = isServerFault && isProduction(env) ? 'Internal server error' : appError.message;

    res.status(appError.httpStatus).json(
      apiFailure({
        code: appError.code,
        message,
        requestId: req.id,
        // Details are only ever attached deliberately, and never for 5xx.
        ...(appError.details !== undefined && !isServerFault ? { details: appError.details } : {}),
      }),
    );
  };
}

export { ERROR_CODES };
