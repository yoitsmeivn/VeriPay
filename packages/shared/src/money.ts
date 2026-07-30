/**
 * Money handling for VeriPay.
 *
 * INVARIANT: every monetary amount in this system is an integer number of
 * minor units (cents, pence, yen). Floating point never touches a payment
 * amount — not in storage, not in arithmetic, not in parsing. Stripe expects
 * integer minor units and so do we.
 */

import { z } from 'zod';

import { type Currency, minorUnitExponent } from './domain/currency.js';
import { ValidationError } from './errors.js';

export interface Money {
  /** Integer count of minor units. Always an integer, may be negative. */
  readonly amountMinor: number;
  readonly currency: Currency;
}

export type RoundingMode = 'half-even' | 'half-up' | 'floor' | 'ceil';

/**
 * Strict decimal notation: an optional sign, digits, and an optional fraction.
 *
 * Deliberately rejects exponent notation (`1e2`), thousands separators
 * (`1,000`), whitespace, a leading `+`, and a bare `.5` — every form whose
 * decimal value could be read more than one way.
 */
const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

/**
 * Runtime guard for major-unit amounts arriving from outside the process
 * (HTTP bodies, form fields, third-party payloads).
 */
export const majorAmountStringSchema = z
  .string()
  .regex(DECIMAL_PATTERN, 'Amount must be plain decimal notation, e.g. "12.34"');

/** Throws unless `amountMinor` is a safe integer count of minor units. */
export function assertValidMinorAmount(amountMinor: number): void {
  if (!Number.isInteger(amountMinor)) {
    throw new ValidationError(
      `Monetary amounts must be integer minor units, received ${String(amountMinor)}`,
    );
  }
  if (!Number.isSafeInteger(amountMinor)) {
    throw new ValidationError(
      `Monetary amount ${String(amountMinor)} exceeds the safe integer range`,
    );
  }
}

export function money(amountMinor: number, currency: Currency): Money {
  assertValidMinorAmount(amountMinor);
  return { amountMinor, currency };
}

export function zeroMoney(currency: Currency): Money {
  return { amountMinor: 0, currency };
}

export function isSameCurrency(a: Money, b: Money): boolean {
  return a.currency === b.currency;
}

function assertSameCurrency(a: Money, b: Money, operation: string): void {
  if (!isSameCurrency(a, b)) {
    throw new ValidationError(
      `Cannot ${operation} amounts in different currencies (${a.currency} and ${b.currency})`,
    );
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'add');
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'subtract');
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function negateMoney(value: Money): Money {
  return money(-value.amountMinor, value.currency);
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b, 'compare');
  if (a.amountMinor < b.amountMinor) return -1;
  if (a.amountMinor > b.amountMinor) return 1;
  return 0;
}

export function isZeroMoney(value: Money): boolean {
  return value.amountMinor === 0;
}

function roundToInteger(value: number, mode: RoundingMode): number {
  switch (mode) {
    case 'floor':
      return Math.floor(value);
    case 'ceil':
      return Math.ceil(value);
    case 'half-up':
      return Math.sign(value) * Math.round(Math.abs(value));
    case 'half-even': {
      const floor = Math.floor(value);
      const diff = value - floor;
      if (diff > 0.5) return floor + 1;
      if (diff < 0.5) return floor;
      return floor % 2 === 0 ? floor : floor + 1;
    }
  }
}

/**
 * Scales an amount by a ratio (a fee percentage, for example).
 *
 * The rounding mode is required at the call site rather than defaulted
 * silently, because which way a half-cent falls is a product decision.
 */
export function multiplyMoney(
  value: Money,
  factor: number,
  rounding: RoundingMode = 'half-even',
): Money {
  if (!Number.isFinite(factor)) {
    throw new ValidationError(`Multiplier must be finite, received ${String(factor)}`);
  }
  return money(roundToInteger(value.amountMinor * factor, rounding), value.currency);
}

/**
 * Splits an amount across weighted parts without losing or inventing minor
 * units. The remainder is distributed one unit at a time to the largest
 * fractional parts, so the parts always sum back to the original amount.
 */
export function allocateMoney(value: Money, weights: readonly number[]): Money[] {
  if (weights.length === 0) {
    throw new ValidationError('Allocation requires at least one weight');
  }
  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new ValidationError('Allocation weights must be finite and non-negative');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    throw new ValidationError('Allocation weights must sum to a positive value');
  }

  const exact = weights.map((weight) => (value.amountMinor * weight) / totalWeight);
  const floored = exact.map((part) => Math.floor(part));
  let remainder = value.amountMinor - floored.reduce((sum, part) => sum + part, 0);

  // Hand out the leftover units to the largest fractional parts first.
  const order = exact
    .map((part, index) => ({ index, fraction: part - Math.floor(part) }))
    .sort((a, b) => b.fraction - a.fraction);

  const amounts = [...floored];
  for (const { index } of order) {
    if (remainder === 0) break;
    const step = remainder > 0 ? 1 : -1;
    amounts[index] = (amounts[index] ?? 0) + step;
    remainder -= step;
  }

  return amounts.map((amountMinor) => money(amountMinor, value.currency));
}

/**
 * Converts a major-unit decimal *string* into integer minor units.
 *
 * Only strings are accepted, and the conversion is done on the digit
 * characters rather than by multiplying a float, so `"0.29"` in USD is exactly
 * 29 rather than the 28.999999999999996 a naive `0.29 * 100` produces.
 */
export function parseMajorToMinor(input: string, currency: Currency): number {
  const normalised = majorAmountStringSchema.parse(input);
  const exponent = minorUnitExponent(currency);

  const negative = normalised.startsWith('-');
  const unsigned = negative ? normalised.slice(1) : normalised;
  const [integerPart = '', fractionPart = ''] = unsigned.split('.');

  if (fractionPart.length > exponent) {
    throw new ValidationError(
      `${currency.toUpperCase()} supports at most ${String(exponent)} decimal place(s), received "${input}"`,
    );
  }

  const digits = `${integerPart}${fractionPart.padEnd(exponent, '0')}`;
  const amountMinor = Number(digits);
  assertValidMinorAmount(amountMinor);

  return negative ? -amountMinor : amountMinor;
}

/** Renders minor units back to a plain major-unit decimal string. */
export function minorToMajorString(value: Money): string {
  const exponent = minorUnitExponent(value.currency);
  const negative = value.amountMinor < 0;
  const digits = Math.abs(value.amountMinor)
    .toString()
    .padStart(exponent + 1, '0');
  const integerPart = digits.slice(0, digits.length - exponent);
  const fractionPart = digits.slice(digits.length - exponent);
  const rendered = exponent === 0 ? integerPart : `${integerPart}.${fractionPart}`;
  return negative ? `-${rendered}` : rendered;
}

/** Human-facing formatting. Never use the result for arithmetic. */
export function formatMoney(value: Money, locale = 'en-US'): string {
  const exponent = minorUnitExponent(value.currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: value.currency.toUpperCase(),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(value.amountMinor / 10 ** exponent);
}
