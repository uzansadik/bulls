/**
 * @openbulls/agent-runtime — finalize-usage node.
 *
 * Closes the reservation opened by `reserve-credit`. The cost comes
 * from the usage rollup on `state.usage` (prompt+completion tokens
 * converted via the pricing catalog at finalize time). On success,
 * the reservation id is cleared from state and `state.budget.finalCost`
 * is stamped for telemetry.
 */
import { NodeExecutionFailedError } from "../domain/errors";
import type { NodeDefinition, NodeDeps } from "../domain/graph";
import type { AgentRunState } from "../domain/state";

export const finalizeUsageNode: NodeDefinition<AgentRunState> = {
  name: "finalize-usage",
  /**
   * Idempotent: a previous finalize set `state.budget.finalCost` and
   * cleared the reservationId — a second invocation becomes a no-op
   * so resume safety is preserved.
   */
  idempotent: true,
  async run(state, deps: NodeDeps) {
    const billing = deps.billing;
    if (!billing) {
      throw new NodeExecutionFailedError("finalize-usage", "billing gateway missing from deps");
    }
    const reservationId = state.budget?.reservationId;
    if (!reservationId) {
      // Already finalized (or no run reservation exists). Skip silently.
      deps.logger.info("finalize-usage skipped — no active reservation", {
        runId: state.runId,
        existingFinalCost: state.budget?.finalCost ?? null,
      });
      return {};
    }
    const finalCost = state.usage?.costUsd ?? state.budget?.estimatedCost ?? "0";
    const result = await billing.finalizeUsage({
      reservationId,
      actualCost: finalCost,
    });
    if (!result.ok) {
      throw new NodeExecutionFailedError(
        "finalize-usage",
        `${result.error.code}: ${result.error.message}`,
      );
    }
    deps.logger.info("usage finalized", {
      runId: state.runId,
      reservationId,
      finalCost,
    });
    return {
      budget: {
        estimatedCost: state.budget?.estimatedCost ?? finalCost,
        reservedCost: state.budget?.reservedCost,
        finalCost,
        reservationId: undefined,
      },
    };
  },
};
