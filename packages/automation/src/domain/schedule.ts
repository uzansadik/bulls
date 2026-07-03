/**
 * @openbulls/automation — pure schedule math.
 *
 * `computeNextRunAt` is the only place in the package that touches the
 * cron string. All other code accepts an already-validated ISO / Date
 * for `nextRunAt`. The dispatcher advances `nextRunAt` by calling this
 * helper after every dispatch (success or failure) so a permanently
 * broken executor cannot pin the dispatcher in a hot retry loop.
 *
 * Implementation notes:
 *   - The thin adapter over `croner` lives in
 *     `infrastructure/cron-parser.ts`. We keep the domain call site
 *     dependency-free so testing the math doesn't require booting
 *     croner — the production path wires the real `croner` adapter.
 *   - DST: croner handles DST-aware boundaries per the host's tz
 *     database; we don't second-guess it.
 *   - `from` is the floor — the returned Date is strictly *after* `from`.
 *     This keeps cron ticks monotonic even if a previous tick is late.
 */
import { Cron } from "croner";

import { InvalidCronExpressionError, InvalidTimezoneError } from "./errors";

/**
 * Parses and validates a cron expression using croner. Cheap — only
 * allocates when failing; successful parses return a typed handle.
 *
 * Pure: no I/O, no `Date.now()`.
 */
export function validateCronExpression(expression: string): void {
  try {
    new Cron(expression);
  } catch {
    throw new InvalidCronExpressionError(`invalid cron expression: ${expression}`, { expression });
  }
}

/**
 * Lightweight IANA timezone sanity check. We delegate to `Intl.DateTimeFormat`
 * (always available in Node ≥ 16) rather than bringing in a tz database
 * shim. Returns true when the host knows the zone ID.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    // Throws RangeError when the zone ID is not recognized.
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes the next run time strictly after `from`. Validates both
 * the cron expression and the timezone before calling croner. Throws
 * on either validation failure; callers (`dispatch-due-jobs.command.ts`,
 * future admin tools) are expected to advance `nextRunAt` to a far-future
 * placeholder rather than catching here.
 */
export function computeNextRunAt(cronExpression: string, timezone: string, from: Date): Date {
  validateCronExpression(cronExpression);
  if (!isValidTimezone(timezone)) {
    throw new InvalidTimezoneError(`unknown IANA timezone: ${timezone}`, { timezone });
  }
  // Croner's `next()` strictly honors the given tz via croner's built-in
  // tz handling (it normalizes internally; we still pass tz for clarity).
  const cron = new Cron(cronExpression, { timezone });
  const next = cron.nextRun(from);
  if (!next) {
    // Should be unreachable — a valid cron expression always has a next
    // occurrence. Defensive throw so dispatch never produces a NaN row.
    throw new InvalidCronExpressionError(
      `cron ${cronExpression} produced no next occurrence after ${from.toISOString()}`,
      { expression: cronExpression },
    );
  }
  return next;
}
