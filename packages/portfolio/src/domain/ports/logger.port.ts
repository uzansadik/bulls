/**
 * @openbulls/portfolio — LoggerLike port.
 *
 * Mirrors `@openbulls/market-data`'s `LoggerLike` so the package
 * can accept any pino-compatible logger via composition without
 * importing `@openbulls/logger` directly.
 */
export interface LoggerLike {
  readonly debug: (msg: string, meta?: Record<string, unknown>) => void;
  readonly info: (msg: string, meta?: Record<string, unknown>) => void;
  readonly warn: (msg: string, meta?: Record<string, unknown>) => void;
  readonly error: (msg: string, meta?: Record<string, unknown>) => void;
}

export const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};