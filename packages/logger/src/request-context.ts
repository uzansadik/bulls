import { AsyncLocalStorage } from "node:async_hooks";
import type { Logger } from "pino";
import { logger } from "./logger.js";

/** Per-request scoped metadata, attached to every log entry. */
export interface RequestContext {
  readonly requestId: string;
  readonly userId?: string;
  readonly route?: string;
  readonly traceId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with a request-scoped context. */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Run `fn` with a request-scoped context (async). */
export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/** Returns the active context, or `undefined` if no scope is active. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * A logger that automatically merges the active `RequestContext` into every
 * log entry. Falls back to the base logger when no context is set.
 */
export function contextLogger(): Logger {
  const ctx = getRequestContext();
  if (!ctx) return logger;
  return logger.child(ctx);
}
