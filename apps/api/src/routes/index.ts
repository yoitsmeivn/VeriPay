import { Router } from 'express';

import { type Authenticator } from '../auth/jwt.js';
import { healthRouter } from './health.js';
import { meRouter } from './me.js';

export interface ApiRouterOptions {
  readonly version: string;
  readonly authenticator: Authenticator;
}

/** Everything mounted under `/api`. */
export function apiRouter(options: ApiRouterOptions): Router {
  const router = Router();

  // Public. Uptime checks and the web app's status panel call this
  // unauthenticated, so it must never sit behind requireAuth.
  router.use(healthRouter({ version: options.version }));

  // Protected. Each router applies requireAuth to its own routes rather than
  // relying on mount order, so a future public route added here cannot
  // accidentally inherit — or lose — authentication.
  router.use(meRouter(options.authenticator));

  return router;
}
