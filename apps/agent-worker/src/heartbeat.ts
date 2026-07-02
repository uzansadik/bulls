/**
 * apps/agent-worker — heartbeat.
 *
 * Logs a single "alive" line every `intervalMs` so a long-running
 * worker doesn't look stuck in the absence of job traffic. The
 * logger decides whether that means an actual stdout line or a
 * `pino.debug` event; tests use a noop logger and skip the timer.
 */
import type { LoggerLike } from "@openbulls/logger";

export interface Heartbeat {
  /** Stop the heartbeat. */
  stop(): void;
}

export function startHeartbeat(
  logger: LoggerLike,
  intervalMs: number,
  getMeta: () => Record<string, unknown> = () => ({}),
): Heartbeat {
  const handle = setInterval(() => {
    logger.info("agent-worker alive", getMeta());
  }, intervalMs);
  // Worker must not keep the process alive on its own; SIGTERM
  // paths exit cleanly even when there is no other I/O.
  if (typeof handle.unref === "function") {
    handle.unref();
  }
  return {
    stop(): void {
      clearInterval(handle);
    },
  };
}
