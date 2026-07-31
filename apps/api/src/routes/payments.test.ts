import {
  ERROR_CODES,
  apiFailureSchema,
  fundDealResponseSchema,
} from '@veripay/shared';
import { pino } from 'pino';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../app.js';
import {
  TEST_AUDIENCE,
  TEST_ISSUER,
  type TestKeyring,
  createTestKeyring,
} from '../auth/__fixtures__/tokens.js';
import { createAuthenticator } from '../auth/jwt.js';
import { type Env, loadEnv } from '../config/env.js';
import { type StripeGateway } from '../stripe/gateway.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';

let keyring: TestKeyring;

beforeAll(async () => {
  keyring = await createTestKeyring();
});

function createMockStripeGateway(
  overrides: Partial<StripeGateway> = {},
): StripeGateway {
  return {
    createFundCheckoutSession: ({ dealRef }) =>
      Promise.resolve({
        checkoutUrl: 'https://checkout.stripe.test/session',
        sessionId: 'cs_test_123',
        dealRef,
      }),
    createConnectOnboardingLink: () =>
      Promise.resolve({
        onboardingUrl: 'https://connect.stripe.test/onboard',
        accountId: 'acct_test_123',
      }),
    constructWebhookEvent: () => {
      throw new Error('not implemented in mock');
    },
    ...overrides,
  };
}

function buildApp(
  overrides: Record<string, string | undefined> = {},
  stripe: StripeGateway | undefined = createMockStripeGateway(),
) {
  const env: Env = loadEnv({
    NODE_ENV: 'test',
    WEB_ORIGIN: ALLOWED_ORIGIN,
    LOG_LEVEL: 'silent',
    ...overrides,
  });
  const authenticator = createAuthenticator({
    issuer: TEST_ISSUER,
    audience: TEST_AUDIENCE,
    keyResolver: keyring.keyResolver,
  });
  return createApp({
    env,
    logger: pino({ level: 'silent' }),
    authenticator,
    stripe,
    version: '0.1.0-test',
  });
}

describe('POST /api/payments/fund', () => {
  it('requires authentication', async () => {
    const response = await request(buildApp())
      .post('/api/payments/fund')
      .send({ dealRef: 'A7F3' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe(ERROR_CODES.UNAUTHENTICATED);
  });

  it('returns a checkout URL for a known demo deal', async () => {
    const token = await keyring.sign({});
    const response = await request(buildApp())
      .post('/api/payments/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealRef: 'a7f3' });

    expect(response.status).toBe(200);
    expect(fundDealResponseSchema.safeParse(response.body).success).toBe(true);
    expect(response.body.data.checkoutUrl).toBe('https://checkout.stripe.test/session');
    expect(response.body.data.dealRef).toBe('A7F3');
  });

  it('returns 404 for an unknown deal', async () => {
    const token = await keyring.sign({});
    const response = await request(buildApp())
      .post('/api/payments/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealRef: 'ZZZZ' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('returns 502 when Stripe is not configured', async () => {
    const token = await keyring.sign({});
    const response = await request(buildApp({}, undefined))
      .post('/api/payments/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealRef: 'A7F3' });

    expect(response.status).toBe(502);
    expect(apiFailureSchema.safeParse(response.body).success).toBe(true);
  });

  it('returns 502 when Stripe Checkout fails', async () => {
    const token = await keyring.sign({});
    const stripe = createMockStripeGateway({
      createFundCheckoutSession: () => Promise.reject(new Error('stripe down')),
    });
    const response = await request(buildApp({}, stripe))
      .post('/api/payments/fund')
      .set('Authorization', `Bearer ${token}`)
      .send({ dealRef: 'B8E1' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe(ERROR_CODES.UPSTREAM_UNAVAILABLE);
  });
});

describe('POST /api/connect/onboarding', () => {
  it('returns an onboarding URL for an authenticated seller', async () => {
    const token = await keyring.sign({});
    const response = await request(buildApp())
      .post('/api/connect/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.onboardingUrl).toBe('https://connect.stripe.test/onboard');
  });
});
