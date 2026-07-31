import express, { type Express } from 'express';
import { pinoHttp } from 'pino-http';

import { type Authenticator } from './auth/jwt.js';
import { type Env, isProduction } from './config/env.js';
import { type Logger } from './lib/logger.js';
import { corsPolicy } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { securityHeaders } from './middleware/security.js';
import { apiRouter } from './routes/index.js';
import { stripeWebhookRouter } from './routes/stripe-webhook.js';
import { type StripeGateway } from './stripe/gateway.js';

/**
 * Maximum accepted JSON body.
 *
 * Generous for the small documents this API exchanges, and small enough that
 * an unauthenticated caller cannot use body size as a memory-exhaustion lever.
 */
export const JSON_BODY_LIMIT = '100kb';

export interface AppDependencies {
  readonly env: Env;
  readonly logger: Logger;
  /**
   * Verifies Auth0 access tokens.
   *
   * Required, not optional: if this could be omitted, a wiring mistake would
   * silently produce an app whose protected routes are open. `server.ts` builds
   * the real one from the environment; tests inject a deterministic stub.
   */
  readonly authenticator: Authenticator;
  /** Present when STRIPE_SECRET_KEY is configured. */
  readonly stripe?: StripeGateway;
  readonly version?: string;
}

/**
 * Builds the Express application.
 *
 * Deliberately does not listen on a port — `server.ts` owns that. Keeping the
 * two apart is what lets Supertest exercise the real middleware stack without
 * binding a socket.
 */
export function createApp(deps: AppDependencies): Express {
  const { env, logger } = deps;
  const version = deps.version ?? '0.1.0';

  const app = express();

  app.disable('x-powered-by');
  // Behind Vercel/a load balancer, one proxy hop is what sets X-Forwarded-*.
  // Trusting proxies in development would let a local client spoof its IP.
  app.set('trust proxy', isProduction(env) ? 1 : false);

  // Correlation id first: everything downstream, including the logger, uses it.
  app.use(requestId());

  app.use(
    pinoHttp({
      logger,
      // `requestId()` runs first, so `req.id` is always populated by here.
      genReqId: (req) => req.id,
      autoLogging: {
        // The health endpoint is polled continuously by uptime checks; logging
        // every hit buries real traffic.
        ignore: (req) => req.url === '/api/health',
      },
    }),
  );

  app.use(securityHeaders());
  app.use(corsPolicy(env));

  // Stripe webhooks need the raw body for signature verification.
  app.use(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    stripeWebhookRouter({ stripe: deps.stripe, logger }),
  );

  app.use(express.json({ limit: JSON_BODY_LIMIT }));

  app.use(
    '/api',
    apiRouter({
      version,
      authenticator: deps.authenticator,
      ...(deps.stripe !== undefined ? { stripe: deps.stripe } : {}),
    }),
  );

  app.use(notFoundHandler());
  // Must be last: Express identifies the error handler by its arity.
  app.use(errorHandler(env, logger));

  return app;
}
