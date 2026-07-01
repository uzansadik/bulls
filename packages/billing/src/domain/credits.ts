/**
 * @openbulls/billing — credit arithmetic helpers.
 *
 * Numeric strings on the credit ledger (numeric(20,8)) cannot go
 * through JS `Number` losslessly for every magnitude, but for the
 * 8-decimal, 20-digit range used here the native representation is
 * safe. If we ever extend past ~9 trillion credits per row we
 * should swap this module for `decimal.js`; until then it stays
 * dependency-free.
 *
 * Every operation returns a fresh numeric string formatted to 8
 * decimal places so callers can write the result directly into the
 * ledger without further normalization.
 */

/** Format a number as a numeric(20,8)-shaped string. */
const fmt = (n: number): string => n.toFixed(8);

export const credits = {
  add(a: string, b: string): string {
    return fmt(Number(a) + Number(b));
  },
  sub(a: string, b: string): string {
    return fmt(Number(a) - Number(b));
  },
  /**
   * Compare two numeric strings. Returns -1 / 0 / +1.
   * Uses simple `Number()` since the dynamic range is bounded.
   */
  cmp(a: string, b: string): -1 | 0 | 1 {
    const diff = Number(a) - Number(b);
    if (diff < 0) return -1;
    if (diff > 0) return 1;
    return 0;
  },
  isGte(a: string, b: string): boolean {
    return Number(a) >= Number(b);
  },
  zero(): string {
    return "0.00000000";
  },
} as const;

export type CreditsHelper = typeof credits;
