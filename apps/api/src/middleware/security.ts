import { type RequestHandler } from 'express';
import helmet from 'helmet';

/**
 * Standard HTTP security headers.
 *
 * Serving JSON rather than HTML is not a reason to skip these: HSTS,
 * nosniff, frame denial and referrer policy all still apply to an API, and
 * they cost nothing.
 *
 * Only one default is overridden — see below.
 */
export function securityHeaders(): RequestHandler {
  return helmet({
    // Helmet defaults to `same-origin`, which instructs the browser to block
    // cross-origin reads of this response — that would defeat the CORS
    // allowlist for the web app on a different port. `cross-origin` hands
    // access control back to CORS, which is where it belongs for an API.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
}
