import {
  NotFoundError,
  UpstreamUnavailableError,
  apiSuccess,
  findDemoDeal,
  fundDealPayloadSchema,
  fundDealRequestSchema,
} from '@veripay/shared';
import { Router } from 'express';

import { type Authenticator } from '../auth/jwt.js';
import { requireAuth, requirePrincipal } from '../middleware/require-auth.js';
import { type StripeGateway } from '../stripe/gateway.js';

export interface PaymentsRouterDeps {
  readonly authenticator: Authenticator;
  readonly stripe: StripeGateway | undefined;
}

/**
 * Creates a Stripe Checkout Session so the buyer can fund a deal.
 *
 * Payment state advances only from signature-verified webhooks — the redirect
 * back from Checkout means the browser returned, nothing more.
 */
export function paymentsRouter(deps: PaymentsRouterDeps): Router {
  const router = Router();

  router.post('/payments/fund', requireAuth(deps.authenticator), async (req, res) => {
    if (deps.stripe === undefined) {
      throw new UpstreamUnavailableError('Stripe is not configured on this server');
    }

    const { dealRef } = fundDealRequestSchema.parse(req.body);
    const principal = requirePrincipal(req);

    if (findDemoDeal(dealRef) === undefined) {
      throw new NotFoundError(`Deal #${dealRef} not found`);
    }

    let result;
    try {
      result = await deps.stripe.createFundCheckoutSession({
        dealRef,
        buyerSub: principal.sub,
        ...(principal.email !== undefined ? { buyerEmail: principal.email } : {}),
      });
    } catch (error) {
      throw new UpstreamUnavailableError('Could not start Stripe Checkout', { cause: error });
    }

    res.status(200).json(apiSuccess(fundDealPayloadSchema.parse(result)));
  });

  return router;
}
