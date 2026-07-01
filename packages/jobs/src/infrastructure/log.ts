/**
 * @openbulls/jobs — minimal logger interface.
 *
 * Mirrors `packages/portfolio`'s `LoggerLike` so both packages share the
 * same DI shape. The full `pino` instance from `@openbulls/logger` is
 * accepted at the composition root (when its public API lands) without
 * any adapter code.
 */

export interface LoggerLike {
  debug: (msg: string, ctx?: Readonly<Record<string, unknown>>) => void;
  info: (msg: string, ctx?: Readonly<Record<string, unknown>>) => void;
  warn: (msg: string, ctx?: Readonly<Record<string, unknown>>) => void;
  error: (msg: string, err?: unknown, ctx?: Readonly<Record<string, unknown>>) => void;
}

export const noopLogger: LoggerLike = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Best-effort adapter: accepts a `pino`-shaped logger (or anything
 * matching `LoggerLike`) and returns a `LoggerLike`. We never throw on
 * missing methods — we default to no-ops so a misconfigured logger
 * doesn't crash the worker.
 */
export function toLoggerLike(input: Partial<LoggerLike> | undefined): LoggerLike {
  if (!input) return noopLogger;
  const fn = <K extends keyof LoggerLike>(level: K): LoggerLike[K] => {
    const candidate = input[level];
    if (typeof candidate === "function") {
      return candidate.bind(input) as LoggerLike[K];
    }
    return ((..._args: unknown[]) => {}) as LoggerLike[K];
  };
  return {
    debug: fn("debug"),
    info: fn("info"),
    warn: fn("warn"),
    error: fn("error"),
  };
}
