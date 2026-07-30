/**
 * Zod schemas for the wire format.
 *
 * The API validates outgoing payloads against these and the browser client
 * validates incoming ones, so a contract drift shows up as a test failure
 * rather than an undefined field in production.
 */

import { z } from 'zod';

import { CURRENCIES } from './domain/currency.js';
import { ERROR_CODES } from './errors.js';

export const currencySchema = z.enum(CURRENCIES);

export const errorCodeSchema = z.enum(
  Object.values(ERROR_CODES) as [(typeof ERROR_CODES)[keyof typeof ERROR_CODES]],
);

export const moneySchema = z.object({
  // z.int() is a safe integer in Zod 4 — exactly the money invariant.
  amountMinor: z.int(),
  currency: currencySchema,
});

export const healthStatusSchema = z.enum(['ok', 'degraded']);

export const healthPayloadSchema = z.object({
  status: healthStatusSchema,
  service: z.string().min(1),
  version: z.string().min(1),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;
export type HealthPayload = z.infer<typeof healthPayloadSchema>;

export const apiErrorBodySchema = z.object({
  code: errorCodeSchema,
  message: z.string(),
  requestId: z.string().min(1),
  details: z.unknown().optional(),
});

export const apiFailureSchema = z.object({
  ok: z.literal(false),
  error: apiErrorBodySchema,
});

/** Wraps a payload schema in the success envelope. */
export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({ ok: z.literal(true), data });
}

export const healthResponseSchema = apiSuccessSchema(healthPayloadSchema);

export type HealthResponse = z.infer<typeof healthResponseSchema>;
