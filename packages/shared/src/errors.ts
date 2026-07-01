/**
 * @openbulls/shared — `AppError` base class.
 *
 * All domain errors in `@openbulls/*` packages extend this. It carries a
 * stable `code` (used for client mapping and log filters) and inherits
 * native `Error.cause` for exception chaining.
 *
 * Concrete errors live in their respective domain packages (e.g.
 * `packages/billing/src/domain/errors.ts`).
 */
export abstract class AppError extends Error {
  /**
   * Stable, machine-readable error code.
   * Convention: `<domain>/<slug>` (e.g. `billing/insufficient-credits`).
   */
  abstract readonly code: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /** JSON-safe representation suitable for API responses and logs. */
  toJSON(): { code: string; message: string; name: string } {
    return {
      code: this.code,
      message: this.message,
      name: this.name,
    };
  }
}
