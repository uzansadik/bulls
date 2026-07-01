/**
 * @openbulls/market-data — internal logger abstraction.
 *
 * The package never imports `@openbulls/logger` directly. Instead it
 * declares a small `LoggerLike` interface (debug/info/warn/error with
 * structured meta) and ships a `noopLogger` default. The composition
 * root in `@openbulls/market-data/infrastructure/composition.ts`
 * optionally injects the real pino-based logger from
 * `@openbulls/logger` once that barrel is wired.
 *
 * Why: keeps `market-data` self-contained and lets the package work
 * in `apps/web` and `apps/agent-worker` without forcing a hard
 * dependency on `@openbulls/logger`.
 */
export interface LoggerLike {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export const noopLogger: LoggerLike = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
