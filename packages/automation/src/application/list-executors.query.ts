import type { IExecutorRegistry } from "./executor-registry";
/**
 * @openbulls/automation — `listExecutors` ops query.
 *
 * Used by:
 *   - The cron process boot log (so a misconfigured registry is
 *     visible at startup).
 *   - The future admin UI (Faz 8) — "which executor types are
 *     available in this environment".
 *
 * The output is intentionally minimal: just `type`. Anything else
 * (input schema, default cron expression) lives in the admin tool's
 * static catalog (Faz 8) so this query stays cheap.
 */
import type { ExecutorDescriptor } from "./jobs.types";

export function listExecutors(registry: IExecutorRegistry): readonly ExecutorDescriptor[] {
  return Object.freeze(
    registry.list().map((executor): ExecutorDescriptor => ({ type: executor.type })),
  );
}
