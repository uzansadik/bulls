/**
 * @openbulls/agent-runtime — public service interfaces.
 *
 * The composition root returns `CompiledGraphBundle` so callers
 * (workers, tests, future API handlers) don't reach into private
 * packages or instantiate internals themselves.
 *
 * Keep this file thin — interfaces only, no logic.
 */

/** Logger shape every node receives. */
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

/** Wall-clock injected for tests. Returns epoch ms. */
export type NowFn = () => number;