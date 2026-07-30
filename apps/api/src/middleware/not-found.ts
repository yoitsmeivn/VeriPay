import { NotFoundError } from '@veripay/shared';
import { type RequestHandler } from 'express';

/**
 * Terminal handler for unmatched routes.
 *
 * Forwards a typed error rather than responding directly, so unknown routes
 * produce exactly the same envelope as every other failure.
 */
export function notFoundHandler(): RequestHandler {
  return (req, _res, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
  };
}
