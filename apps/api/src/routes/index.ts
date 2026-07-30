import { Router } from 'express';

import { healthRouter } from './health.js';

export interface ApiRouterOptions {
  readonly version: string;
}

/** Everything mounted under `/api`. */
export function apiRouter(options: ApiRouterOptions): Router {
  const router = Router();

  router.use(healthRouter({ version: options.version }));

  // Deals, payments and Stripe webhooks mount here as they are built.

  return router;
}
