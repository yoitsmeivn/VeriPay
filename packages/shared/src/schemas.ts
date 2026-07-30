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

// ---------------------------------------------------------------------------
// Authentication
//
// The authenticated caller, derived purely from a verified Auth0 access token.
// `sub` is the stable Auth0 user identifier and the only claim guaranteed to be
// present; it is what VeriPay will key its own user records on.
//
// This describes an *authenticated* principal, not an authorized one. Auth0
// says who the caller is; what they may do is VeriPay's decision, made against
// VeriPay's own data. Do not add roles or permissions here.
// ---------------------------------------------------------------------------

export const authPrincipalSchema = z.object({
  sub: z.string().min(1),
  email: z.email().optional(),
  emailVerified: z.boolean().optional(),
  name: z.string().min(1).optional(),
  picture: z.url().optional(),
  /** Parsed from the space-delimited `scope` claim. Empty when absent. */
  scope: z.array(z.string()).default([]),
});

export type AuthPrincipal = z.infer<typeof authPrincipalSchema>;

export const meResponseSchema = apiSuccessSchema(authPrincipalSchema);

export type MeResponse = z.infer<typeof meResponseSchema>;
