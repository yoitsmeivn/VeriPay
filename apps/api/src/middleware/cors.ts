import cors from 'cors';
import { type RequestHandler } from 'express';

import { type Env } from '../config/env.js';
import { REQUEST_ID_HEADER } from './request-id.js';

/**
 * Cross-origin access, restricted to an explicit allowlist.
 *
 * `credentials` is deliberately FALSE. VeriPay authenticates with Auth0 bearer
 * access tokens sent in the Authorization header, not with cookies, so the
 * browser never needs to attach credentials to a cross-origin request.
 * Enabling it would widen CSRF exposure for no benefit. Turn it on only if a
 * genuinely cookie-based feature is introduced — and add CSRF defences with it.
 *
 * A wildcard origin is never used: unknown origins simply receive no
 * `Access-Control-Allow-Origin` header, and the browser blocks the read.
 */
export function corsPolicy(env: Env): RequestHandler {
  const allowedOrigins = new Set(env.WEB_ORIGIN);

  return cors({
    origin(origin, callback) {
      // Same-origin, server-to-server and curl requests send no Origin header.
      // They are not subject to the browser's cross-origin rules.
      if (origin === undefined) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER],
    maxAge: 600,
    optionsSuccessStatus: 204,
  });
}
