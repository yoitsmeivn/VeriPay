/**
 * Supported currencies.
 *
 * Codes are lowercase to match Stripe's API, which is the ultimate consumer of
 * every amount VeriPay computes.
 */
export const CURRENCIES = ['usd', 'eur', 'gbp', 'jpy'] as const;

export type Currency = (typeof CURRENCIES)[number];

/**
 * Number of decimal places between a currency's major and minor unit.
 *
 * USD has 2 (100 cents = 1 dollar); JPY has 0 (the yen has no minor unit).
 * Getting this wrong by one place is a 100x payment error, so every conversion
 * goes through this table rather than a hardcoded 100.
 */
export const MINOR_UNIT_EXPONENTS: Record<Currency, number> = {
  usd: 2,
  eur: 2,
  gbp: 2,
  jpy: 0,
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}

export function minorUnitExponent(currency: Currency): number {
  return MINOR_UNIT_EXPONENTS[currency];
}
