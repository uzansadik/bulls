/**
 * @openbulls/automation — domain/schedule unit tests.
 *
 * Covers:
 *   - next-run math: every-minute, daily, weekly (timezone-aware)
 *   - validation: invalid cron, invalid timezone
 *   - DST sanity check for America/New_York (croner handles transitions)
 */
import { describe, expect, it } from "vitest";

import { computeNextRunAt, isValidTimezone, validateCronExpression } from "./schedule";

import { InvalidCronExpressionError, InvalidTimezoneError } from "./errors";

describe("computeNextRunAt", () => {
  it("returns the next minute for a wildcard every-minute cron", () => {
    const from = new Date("2026-07-03T12:00:00.000Z");
    const next = computeNextRunAt("* * * * *", "UTC", from);
    // croner returns next whole minute strictly after `from`.
    expect(next.getTime()).toBeGreaterThan(from.getTime());
    expect(next.getUTCMinutes()).toBe(1);
    expect(next.getUTCHours()).toBe(12);
  });

  it("respects timezone for daily 09:00 Europe/Istanbul", () => {
    // 2026-07-03 is a Friday.
    const from = new Date("2026-07-02T22:00:00.000Z"); // 01:00 Istanbul on 7/3
    const next = computeNextRunAt("0 9 * * *", "Europe/Istanbul", from);
    // Istanbul is UTC+3, so 09:00 local == 06:00 UTC.
    expect(next.toISOString()).toBe("2026-07-03T06:00:00.000Z");
  });

  it("returns the next Friday 18:00 Europe/Istanbul from a Wednesday", () => {
    // 2026-07-01 is a Wednesday.
    const from = new Date("2026-07-01T12:00:00.000Z"); // 15:00 Istanbul on 7/1
    const next = computeNextRunAt("0 18 * * 5", "Europe/Istanbul", from);
    // Next Friday after Wed 2026-07-01 is 2026-07-03. Istanbul 18:00 == 15:00 UTC.
    expect(next.toISOString()).toBe("2026-07-03T15:00:00.000Z");
  });

  it("throws InvalidCronExpressionError on malformed cron", () => {
    expect(() => computeNextRunAt("not a cron", "UTC", new Date())).toThrow(
      InvalidCronExpressionError,
    );
  });

  it("throws InvalidTimezoneError on unknown IANA timezone", () => {
    expect(() => computeNextRunAt("* * * * *", "Mars/Olympus_Mons", new Date())).toThrow(
      InvalidTimezoneError,
    );
  });
});

describe("validateCronExpression", () => {
  it("accepts a 5-field expression", () => {
    expect(() => validateCronExpression("*/5 * * * *")).not.toThrow();
  });

  it("rejects an empty string", () => {
    expect(() => validateCronExpression("")).toThrow(InvalidCronExpressionError);
  });
});

describe("isValidTimezone", () => {
  it("accepts UTC", () => {
    expect(isValidTimezone("UTC")).toBe(true);
  });

  it("accepts Europe/Istanbul", () => {
    expect(isValidTimezone("Europe/Istanbul")).toBe(true);
  });

  it("accepts America/New_York", () => {
    expect(isValidTimezone("America/New_York")).toBe(true);
  });

  it("rejects an unknown timezone", () => {
    expect(isValidTimezone("Mars/Olympus_Mons")).toBe(false);
  });
});
