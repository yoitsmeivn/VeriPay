/**
 * Temporary catalog for demo deals until the deals table exists.
 *
 * Amounts are integer minor units. UI copy uses major-unit strings for display
 * only — never parse those back into money.
 */

import { type Currency } from './domain/currency.js';

export interface DemoDeal {
  readonly ref: string;
  readonly title: string;
  readonly amountMinor: number;
  readonly currency: Currency;
}

/** Keys match the short ref in UI labels such as "Deal #A7F3". */
export const DEMO_DEALS: Record<string, DemoDeal> = {
  A7F3: {
    ref: 'A7F3',
    title: '2× Coachella GA Wristbands',
    amountMinor: 74_000,
    currency: 'usd',
  },
  B8E1: {
    ref: 'B8E1',
    title: 'iPhone 15 Pro',
    amountMinor: 78_000,
    currency: 'usd',
  },
};

export function findDemoDeal(dealRef: string): DemoDeal | undefined {
  return DEMO_DEALS[dealRef.toUpperCase()];
}
