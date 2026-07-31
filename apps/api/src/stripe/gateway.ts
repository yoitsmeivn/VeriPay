/**
 * Stripe Connect gateway for funding deals and onboarding sellers.
 *
 * Uses separate charges and transfers: Checkout collects on the platform
 * account; transfers to connected accounts happen later when the buyer
 * confirms receipt (not implemented yet — webhooks only acknowledge funding).
 */

import { findDemoDeal } from '@veripay/shared';
import Stripe from 'stripe';

import { type StripeConfig } from './config.js';

const STRIPE_API_VERSION = '2026-07-29.dahlia' as const;

/** Suffix for Checkout integration_identifier tracking (Stripe best practice). */
const FUND_CHECKOUT_INTEGRATION_ID = 'veripay_fund_k7m2n4p9';

export interface CreateFundCheckoutInput {
  readonly dealRef: string;
  readonly buyerSub: string;
  readonly buyerEmail?: string;
}

export interface FundCheckoutResult {
  readonly checkoutUrl: string;
  readonly sessionId: string;
  readonly dealRef: string;
}

export interface CreateConnectOnboardingInput {
  readonly sellerSub: string;
  readonly sellerEmail?: string;
}

export interface ConnectOnboardingResult {
  readonly onboardingUrl: string;
  readonly accountId: string;
}

export interface StripeGateway {
  createFundCheckoutSession(input: CreateFundCheckoutInput): Promise<FundCheckoutResult>;
  createConnectOnboardingLink(input: CreateConnectOnboardingInput): Promise<ConnectOnboardingResult>;
  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event;
}

export function createStripeGateway(config: StripeConfig): StripeGateway {
  const stripe = new Stripe(config.secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return {
    async createFundCheckoutSession(input: CreateFundCheckoutInput): Promise<FundCheckoutResult> {
      const deal = findDemoDeal(input.dealRef);
      if (deal === undefined) {
        throw new Error(`Unknown deal ref: ${input.dealRef}`);
      }

      const returnQuery = new URLSearchParams({
        as: 'buyer',
        status: 'connected',
        deal: deal.ref,
      });

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'payment',
        integration_identifier: FUND_CHECKOUT_INTEGRATION_ID,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: deal.currency,
              unit_amount: deal.amountMinor,
              product_data: {
                name: deal.title,
                description: `VeriPay conditional payment · Deal #${deal.ref}`,
              },
            },
          },
        ],
        success_url: `${config.checkoutBaseUrl}/deal?${returnQuery.toString()}&fund=return&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${config.checkoutBaseUrl}/deal?${returnQuery.toString()}&fund=cancelled`,
        client_reference_id: deal.ref,
        metadata: {
          dealRef: deal.ref,
          buyerSub: input.buyerSub,
          veripayFlow: 'fund',
        },
      };

      if (input.buyerEmail !== undefined) {
        sessionParams.customer_email = input.buyerEmail;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (session.url === null || session.url === '') {
        throw new Error('Stripe Checkout session did not return a redirect URL');
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        dealRef: deal.ref,
      };
    },

    async createConnectOnboardingLink(
      input: CreateConnectOnboardingInput,
    ): Promise<ConnectOnboardingResult> {
      const accountParams: Stripe.V2.Core.AccountCreateParams = {
        display_name: 'VeriPay seller',
        identity: {
          country: 'us',
          entity_type: 'individual',
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        dashboard: 'express',
        metadata: {
          veripaySellerSub: input.sellerSub,
        },
      };

      if (input.sellerEmail !== undefined) {
        accountParams.contact_email = input.sellerEmail;
      }

      const account = await stripe.v2.core.accounts.create(accountParams);

      const accountLink = await stripe.v2.core.accountLinks.create({
        account: account.id,
        use_case: {
          type: 'account_onboarding',
          account_onboarding: {
            configurations: ['recipient'],
            refresh_url: config.connectRefreshUrl,
            return_url: config.connectReturnUrl,
          },
        },
      });

      if (accountLink.url === '') {
        throw new Error('Stripe account link did not return a redirect URL');
      }

      return {
        onboardingUrl: accountLink.url,
        accountId: account.id,
      };
    },

    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
      if (config.webhookSecret === undefined || config.webhookSecret === '') {
        throw new Error('STRIPE_WEBHOOK_SECRET is required to verify webhooks');
      }
      return stripe.webhooks.constructEvent(payload, signature, config.webhookSecret);
    },
  };
}
