import { randomUUID } from "crypto";

/**
 * Agreements get a stable id so downstream systems - payment links, receipts,
 * webhooks, audit logs - have something durable to key off.
 *
 * The application mints it rather than the tool, because idempotency needs the
 * conversationId and a per-listing tool does not have it. Calling upsert twice
 * for the same (conversationId, listingId) returns the SAME agreementId, so a
 * retry can never mint a second one-time payment link.
 *
 * In-memory, matching MemorySaver's lifetime. The interface is narrow enough to
 * back with a table later without touching callers.
 */

export interface Agreement {
  agreementId: string;
  conversationId: string;
  listingId: string;
  agreedPrice: number;
  buyerId: string;
  sellerId: string;
  createdAt: string;
}

export interface UpsertResult {
  agreement: Agreement;
  /** False when an existing agreement was returned - i.e. this was a retry. */
  isNew: boolean;
}

const agreements = new Map<string, Agreement>();

const key = (conversationId: string, listingId: string) => `${conversationId}::${listingId}`;

export function upsert(input: {
  conversationId: string;
  listingId: string;
  agreedPrice: number;
  buyerId: string;
  sellerId: string;
}): UpsertResult {
  const k = key(input.conversationId, input.listingId);
  const existing = agreements.get(k);
  if (existing) return { agreement: existing, isNew: false };

  const agreement: Agreement = {
    agreementId: `agr_${randomUUID()}`,
    conversationId: input.conversationId,
    listingId: input.listingId,
    agreedPrice: input.agreedPrice,
    buyerId: input.buyerId,
    sellerId: input.sellerId,
    createdAt: new Date().toISOString(),
  };
  agreements.set(k, agreement);
  return { agreement, isNew: true };
}

export const findById = (agreementId: string): Agreement | undefined =>
  [...agreements.values()].find((a) => a.agreementId === agreementId);

export const find = (conversationId: string, listingId: string): Agreement | undefined =>
  agreements.get(key(conversationId, listingId));

/** Test helper. */
export const _reset = (): void => agreements.clear();
