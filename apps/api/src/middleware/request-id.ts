import { randomUUID } from 'node:crypto';

import { type RequestHandler } from 'express';

// Express 5 resolves `Request` from express-serve-static-core, so the
// correlation id is declared there rather than via a global namespace.
declare module 'express-serve-static-core' {
  interface Request {
    /** Correlation id for this request. Always set by `requestId()`. */
    id: string;
  }
}

export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Client-supplied ids are echoed only if they look like an id.
 *
 * Without this guard an attacker controls a value that lands in every log line
 * for the request, which invites log injection and unbounded log growth.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/**
 * Assigns every request a correlation id and echoes it back.
 *
 * Must be registered before the HTTP logger so log lines can reference it.
 */
export function requestId(): RequestHandler {
  return (req, res, next) => {
    const supplied = req.get(REQUEST_ID_HEADER);
    req.id = supplied !== undefined && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, req.id);
    next();
  };
}
