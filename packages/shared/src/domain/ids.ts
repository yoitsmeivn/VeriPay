/**
 * Branded identifier types.
 *
 * A `UserId` and a `DealId` are both strings at runtime, but the brand stops
 * the compiler from letting you pass one where the other belongs. Values can
 * only be produced by parsing, so an unvalidated string can never masquerade
 * as an identifier.
 */

import { z } from 'zod';

export const userIdSchema = z.uuid().brand<'UserId'>();
export const dealIdSchema = z.uuid().brand<'DealId'>();
export const paymentIdSchema = z.uuid().brand<'PaymentId'>();

export type UserId = z.infer<typeof userIdSchema>;
export type DealId = z.infer<typeof dealIdSchema>;
export type PaymentId = z.infer<typeof paymentIdSchema>;

export function toUserId(value: string): UserId {
  return userIdSchema.parse(value);
}

export function toDealId(value: string): DealId {
  return dealIdSchema.parse(value);
}

export function toPaymentId(value: string): PaymentId {
  return paymentIdSchema.parse(value);
}
