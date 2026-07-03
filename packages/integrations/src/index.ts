/**
 * @openbulls/integrations — public barrel.
 *
 * Consumers (`packages/notifications`, `apps/agent-worker`,
 * `apps/telegram-bot`) import everything from this entry point.
 * Internal layout (`domain/`, `application/`) stays free to evolve.
 */

// Domain (encryption + webhook signing)
export * from "./domain";

// Application (config wrappers)
export * from "./application";
