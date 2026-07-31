/**
 * Stripe configuration parsed from the typed environment.
 *
 * Hard-requires payment variables at the point of use so the API can still boot
 * for health checks when Stripe is not configured yet.
 */

import { type Env, EnvironmentError } from '../config/env.js';

export interface StripeConfig {
  readonly secretKey: string;
  readonly webhookSecret: string | undefined;
  readonly connectReturnUrl: string;
  readonly connectRefreshUrl: string;
  /** Where Checkout sends buyers after payment or cancellation. */
  readonly checkoutBaseUrl: string;
}

export function parseStripeConfig(env: Env): StripeConfig {
  if (env.STRIPE_SECRET_KEY === undefined || env.STRIPE_SECRET_KEY === '') {
    throw new EnvironmentError(
      'STRIPE_SECRET_KEY is required for payment routes — add it to .env (see docs/environment.md)',
    );
  }

  const checkoutBaseUrl = env.APP_BASE_URL ?? env.WEB_ORIGIN[0] ?? 'http://localhost:5173';
  const connectReturnUrl = env.STRIPE_CONNECT_RETURN_URL ?? `${checkoutBaseUrl}/deal?as=seller&connect=return`;
  const connectRefreshUrl =
    env.STRIPE_CONNECT_REFRESH_URL ?? `${checkoutBaseUrl}/deal?as=seller&connect=refresh`;

  return {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    connectReturnUrl,
    connectRefreshUrl,
    checkoutBaseUrl,
  };
}
