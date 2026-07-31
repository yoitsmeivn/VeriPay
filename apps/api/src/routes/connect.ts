import { UpstreamUnavailableError, apiSuccess, connectOnboardingPayloadSchema } from '@veripay/shared';
import { Router } from 'express';

import { type Authenticator } from '../auth/jwt.js';
import { requireAuth, requirePrincipal } from '../middleware/require-auth.js';
import { type StripeGateway } from '../stripe/gateway.js';

export interface ConnectRouterDeps {
  readonly authenticator: Authenticator;
  readonly stripe: StripeGateway | undefined;
}

/**
 * Starts Stripe Connect Express onboarding for a seller.
 *
 * Recipient configuration supports separate charges and transfers — funds are
 * held on the platform until the buyer confirms receipt.
 */
export function connectRouter(deps: ConnectRouterDeps): Router {
  const router = Router();

  router.post('/connect/onboarding', requireAuth(deps.authenticator), async (req, res) => {
    if (deps.stripe === undefined) {
      throw new UpstreamUnavailableError('Stripe is not configured on this server');
    }

    const principal = requirePrincipal(req);

    let result;
    try {
      result = await deps.stripe.createConnectOnboardingLink({
        sellerSub: principal.sub,
        ...(principal.email !== undefined ? { sellerEmail: principal.email } : {}),
      });
    } catch (error) {
      throw new UpstreamUnavailableError('Could not start Stripe Connect onboarding', {
        cause: error,
      });
    }

    res.status(200).json(apiSuccess(connectOnboardingPayloadSchema.parse(result)));
  });

  return router;
}
