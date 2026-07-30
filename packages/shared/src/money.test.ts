import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors.js';
import {
  addMoney,
  allocateMoney,
  assertValidMinorAmount,
  compareMoney,
  formatMoney,
  minorToMajorString,
  money,
  multiplyMoney,
  negateMoney,
  parseMajorToMinor,
  subtractMoney,
  zeroMoney,
} from './money.js';

describe('money construction', () => {
  it('accepts integer minor units', () => {
    expect(money(1250, 'usd')).toEqual({ amountMinor: 1250, currency: 'usd' });
  });

  it('rejects fractional minor units', () => {
    expect(() => money(12.5, 'usd')).toThrow(ValidationError);
  });

  it('rejects amounts beyond the safe integer range', () => {
    expect(() => {
      assertValidMinorAmount(Number.MAX_SAFE_INTEGER + 2);
    }).toThrow(ValidationError);
  });

  it('builds a zero amount', () => {
    expect(zeroMoney('gbp')).toEqual({ amountMinor: 0, currency: 'gbp' });
  });
});

describe('arithmetic', () => {
  it('adds and subtracts within a currency', () => {
    const a = money(1000, 'usd');
    const b = money(250, 'usd');
    expect(addMoney(a, b).amountMinor).toBe(1250);
    expect(subtractMoney(a, b).amountMinor).toBe(750);
  });

  it('refuses to mix currencies', () => {
    expect(() => addMoney(money(100, 'usd'), money(100, 'eur'))).toThrow(ValidationError);
    expect(() => subtractMoney(money(100, 'usd'), money(100, 'eur'))).toThrow(ValidationError);
    expect(() => compareMoney(money(100, 'usd'), money(100, 'eur'))).toThrow(ValidationError);
  });

  it('negates and compares', () => {
    expect(negateMoney(money(500, 'usd')).amountMinor).toBe(-500);
    expect(compareMoney(money(100, 'usd'), money(200, 'usd'))).toBe(-1);
    expect(compareMoney(money(200, 'usd'), money(100, 'usd'))).toBe(1);
    expect(compareMoney(money(100, 'usd'), money(100, 'usd'))).toBe(0);
  });

  it('multiplies with an explicit rounding mode', () => {
    // 2.5% of $100.00 is exactly 250 minor units.
    expect(multiplyMoney(money(10_000, 'usd'), 0.025).amountMinor).toBe(250);
    // Banker's rounding keeps a half-unit from always drifting upward.
    expect(multiplyMoney(money(5, 'usd'), 0.5, 'half-even').amountMinor).toBe(2);
    expect(multiplyMoney(money(7, 'usd'), 0.5, 'half-even').amountMinor).toBe(4);
    expect(multiplyMoney(money(5, 'usd'), 0.5, 'half-up').amountMinor).toBe(3);
    expect(multiplyMoney(money(5, 'usd'), 0.5, 'floor').amountMinor).toBe(2);
    expect(multiplyMoney(money(5, 'usd'), 0.5, 'ceil').amountMinor).toBe(3);
  });

  it('rejects a non-finite multiplier', () => {
    expect(() => multiplyMoney(money(100, 'usd'), Number.POSITIVE_INFINITY)).toThrow(
      ValidationError,
    );
  });

  it('always produces integers, never floats', () => {
    const result = multiplyMoney(money(333, 'usd'), 1 / 3);
    expect(Number.isInteger(result.amountMinor)).toBe(true);
  });
});

describe('allocateMoney', () => {
  it('splits without losing or inventing minor units', () => {
    const parts = allocateMoney(money(1000, 'usd'), [1, 1, 1]);
    expect(parts.map((part) => part.amountMinor)).toEqual([334, 333, 333]);
    expect(parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(1000);
  });

  it('honours weights', () => {
    const parts = allocateMoney(money(10_000, 'usd'), [70, 30]);
    expect(parts.map((part) => part.amountMinor)).toEqual([7000, 3000]);
  });

  it('conserves the total for awkward splits', () => {
    const parts = allocateMoney(money(101, 'usd'), [1, 1, 1, 1, 1, 1, 1]);
    expect(parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(101);
  });

  it('conserves the total for negative amounts', () => {
    const parts = allocateMoney(money(-101, 'usd'), [1, 1, 1]);
    expect(parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(-101);
  });

  it('rejects empty or invalid weights', () => {
    expect(() => allocateMoney(money(100, 'usd'), [])).toThrow(ValidationError);
    expect(() => allocateMoney(money(100, 'usd'), [-1, 2])).toThrow(ValidationError);
    expect(() => allocateMoney(money(100, 'usd'), [0, 0])).toThrow(ValidationError);
  });
});

describe('parseMajorToMinor', () => {
  it('converts plain decimal strings exactly', () => {
    expect(parseMajorToMinor('12.34', 'usd')).toBe(1234);
    expect(parseMajorToMinor('0.29', 'usd')).toBe(29);
    expect(parseMajorToMinor('100', 'usd')).toBe(10_000);
    expect(parseMajorToMinor('0.5', 'usd')).toBe(50);
    expect(parseMajorToMinor('-7.05', 'usd')).toBe(-705);
  });

  it('avoids the float drift a naive multiply would introduce', () => {
    // Each of these is wrong when computed as `Number(input) * 100`:
    //   0.29 -> 28.999999999999996 ; 1.15 -> 114.99999999999999 ; 8.20 -> 820.0000000000001
    expect(parseMajorToMinor('0.29', 'usd')).toBe(29);
    expect(parseMajorToMinor('1.15', 'usd')).toBe(115);
    expect(parseMajorToMinor('8.20', 'usd')).toBe(820);
  });

  it('respects zero-decimal currencies', () => {
    expect(parseMajorToMinor('1500', 'jpy')).toBe(1500);
    expect(() => parseMajorToMinor('1500.5', 'jpy')).toThrow(ValidationError);
  });

  it('rejects more fraction digits than the currency allows', () => {
    expect(() => parseMajorToMinor('12.345', 'usd')).toThrow(ValidationError);
  });

  it('rejects ambiguous or non-decimal notation', () => {
    for (const input of ['1e2', '1,000.00', ' 12.34', '12.34 ', '+12.34', '.5', '12.', '', 'abc']) {
      expect(() => parseMajorToMinor(input, 'usd')).toThrow();
    }
  });

  it('rejects values that are not strings', () => {
    // Callers are typed to pass a string; the schema is the runtime backstop
    // for untyped data crossing the process boundary.
    const untyped = 12.34 as unknown as string;
    expect(() => parseMajorToMinor(untyped, 'usd')).toThrow();
  });
});

describe('rendering', () => {
  it('round-trips through minorToMajorString', () => {
    expect(minorToMajorString(money(1234, 'usd'))).toBe('12.34');
    expect(minorToMajorString(money(5, 'usd'))).toBe('0.05');
    expect(minorToMajorString(money(-705, 'usd'))).toBe('-7.05');
    expect(minorToMajorString(money(1500, 'jpy'))).toBe('1500');
  });

  it('formats for humans', () => {
    expect(formatMoney(money(123_456, 'usd'))).toBe('$1,234.56');
    expect(formatMoney(money(1500, 'jpy'))).toBe('¥1,500');
  });
});
