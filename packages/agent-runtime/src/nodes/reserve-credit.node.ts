/**
 * @openbulls/agent-runtime — reserve-credit node.
 *
 * Reads `state.budget.estimatedCost` and asks the billing gateway to
 * lock that amount against the user's wallet. On success, the
 * `reservationId` + `reservedCost` are written back to `state.budget`
 * so downstream nodes (synthesize, finalize-usage) can reference the
 * reservation without re-fetching.
 *
 * On insufficient credits the gateway returns
 * `InsufficientCreditsError`; this node rethrows so the graph halts
 * and the worker can transition the run to `paused`.
 */
import { NodeExecutionFailedError } from "../domain/errors";
import type { NodeDefinition, NodeDeps } from "../domain/graph";
import type { AgentRunState } from "../domain/state";

const DEFAULT_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export const reserveCreditNode: NodeDefinition<AgentRunState> = {
  name: "reserve-credit",
  /**
   * Idempotent: if a prior invocation already produced a reservationId
   * the node skips the gateway call — important for resume.
   */
  idempotent: true,
  async run(state, deps: NodeDeps) {
    const billing = deps.billing;
    if (!billing) {
      throw new NodeExecutionFailedError("reserve-credit", "billing gateway missing from deps");
    }
    const estimated = state.budget?.estimatedCost;
    if (!estimated) {
      throw new NodeExecutionFailedError("reserve-credit", "state.budget.estimatedCost missing");
    }
    // Resume-skip: a previous attempt already locked the credit.
    const existingReservationId = state.budget?.reservationId;
    if (existingReservationId) {
      deps.logger.info("credit reservation already present — skipping", {
        runId: state.runId,
        reservationId: existingReservationId,
      });
      return {};
    }
    const expiresAt = new Date(deps.now() + DEFAULT_TTL_MS);
    const result = await billing.reserveCredit({
      userId: state.userId,
      runId: state.runId,
      reservedAmount: estimated,
      expiresAt,
    });
    if (!result.ok) {
      // Re-throw the typed error so the worker catches and pauses.
      throw result.error;
    }
    deps.logger.info("credit reserved", {
      runId: state.runId,
      reservationId: result.value.reservationId,
      reservedAmount: estimated,
    });
    return {
      budget: {
        estimatedCost: estimated,
        reservedCost: estimated,
        reservationId: result.value.reservationId,
      },
    };
  },
};
