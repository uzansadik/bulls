/**
 * @openbulls/logger — LoggerLike port + noop logger.
 *
 * Mirrors the broader community contract (debug/info/warn/error)
 * so this package can satisfy the agent-runtime, portfolio, and
 * market-data packages without forcing them to depend on pino.
 * Workers pass the real `logger` from `./logger`; tests pass
 * `noopLogger`.
 */
export interface LoggerLike {
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
}

export const noopLogger: LoggerLike = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};