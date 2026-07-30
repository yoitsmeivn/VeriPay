import { type HealthPayload, apiSuccess, healthPayloadSchema } from '@veripay/shared';
import { Router } from 'express';

export const SERVICE_NAME = 'veripay-api';

export interface HealthRouterOptions {
  readonly version: string;
  /** Injected so tests can assert on a deterministic uptime. */
  readonly uptimeSeconds?: () => number;
}

/**
 * Liveness endpoint.
 *
 * Reports that the process is up and serving. It deliberately does NOT touch
 * the database: a health check that fans out to dependencies turns one slow
 * dependency into a cascading outage. Dependency readiness gets its own
 * endpoint when there are dependencies to report on.
 */
export function healthRouter(options: HealthRouterOptions): Router {
  const router = Router();
  const readUptime = options.uptimeSeconds ?? ((): number => process.uptime());

  router.get('/health', (_req, res) => {
    const payload: HealthPayload = healthPayloadSchema.parse({
      status: 'ok',
      service: SERVICE_NAME,
      version: options.version,
      uptimeSeconds: Math.round(readUptime()),
      timestamp: new Date().toISOString(),
    });

    res.status(200).json(apiSuccess(payload));
  });

  return router;
}
