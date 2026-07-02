/**
 * @openbulls/logger
 *
 * Process-wide pino logger + LoggerLike port contract shared with
 * `@openbulls/agent-runtime`, `@openbulls/portfolio`,
 * `@openbulls/market-data`, and `apps/agent-worker`.
 */
export { logger, type Logger } from "./logger";
export type { LoggerLike } from "./logger-like";
export { noopLogger } from "./logger-like";