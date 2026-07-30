import { pino, type Logger } from 'pino';

import { type Env } from '../config/env.js';

export type { Logger };

/** Header and body paths that must never reach a log sink. */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["stripe-signature"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
];

/**
 * Structured JSON logging.
 *
 * Output stays JSON in every environment so local logs and production logs
 * have the same shape. For readable local output, pipe it:
 *   npm run dev:api | npx pino-pretty
 */
export function createLogger(env: Env): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'veripay-api', env: env.NODE_ENV },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: { paths: REDACTED_PATHS, remove: true },
  });
}
