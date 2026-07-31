import { UpstreamUnavailableError } from '@veripay/shared';
import { Router, type Request, type Response } from 'express';

import { type Logger } from '../lib/logger.js';
import { type StripeGateway } from '../stripe/gateway.js';

export interface StripeWebhookRouterDeps {
  readonly stripe: StripeGateway | undefined;
  readonly logger: Logger;
}

/**
 * Signature-verified Stripe webhooks.
 *
 * Mounted with a raw body parser — JSON middleware must not run first.
 * Only verified events may advance payment state; handlers must be idempotent.
 */
export function stripeWebhookRouter(deps: StripeWebhookRouterDeps): Router {
  const router = Router();

  router.post('/', (req: Request, res: Response) => {
    if (deps.stripe === undefined) {
      throw new UpstreamUnavailableError('Stripe is not configured on this server');
    }

    const signature = req.get('stripe-signature');
    if (signature === undefined || signature === '') {
      res.status(400).send('Missing stripe-signature header');
      return;
    }

    const rawBody: unknown = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).send('Webhook body must be raw bytes');
      return;
    }

    let event;
    try {
      event = deps.stripe.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      deps.logger.warn({ err: error, requestId: req.id }, 'stripe webhook signature verification failed');
      res.status(400).send('Webhook signature verification failed');
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      deps.logger.info(
        {
          requestId: req.id,
          sessionId: session.id,
          dealRef: session.metadata?.dealRef,
          paymentStatus: session.payment_status,
        },
        'checkout session completed — deal funding acknowledged (persist on deals table next)',
      );
    } else {
      deps.logger.debug({ requestId: req.id, eventType: event.type }, 'stripe webhook ignored');
    }

    res.status(200).json({ received: true });
  });

  return router;
}
