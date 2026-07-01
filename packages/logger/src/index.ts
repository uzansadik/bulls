/**
 * @openbulls/logger
 *
 * A single pino instance, env-aware (pretty in dev, JSON in prod).
 * Exposes a request-scoped logger via AsyncLocalStorage so that downstream
 * services automatically get a `requestId` / `userId` attached.
 */

export { logger, type Logger } from "./logger.js";
export {
  withRequestContext,
  runWithContext,
  getRequestContext,
  type RequestContext,
} from "./request-context.js";
