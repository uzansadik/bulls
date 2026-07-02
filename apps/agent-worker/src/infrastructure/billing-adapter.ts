import type {
  FinalizeUsageInput,
  FinalizeUsageResult,
  IBillingGateway,
  RefundReservationInput,
  RefundReservationResult,
  ReserveCreditInput,
  ReserveCreditResult,
} from "@openbulls/agent-runtime";
/**
 * apps/agent-worker — billing gateway adapter.
 *
 * Bridges `@openbulls/billing`'s use-case surface
 * (`reserveCredits`, `finalizeUsage`, `refundReservation`) to the
 * narrow `IBillingGateway` port that `@openbulls/agent-runtime`
 * expects from its billing guard nodes.
 *
 * The adapter is intentionally thin — it doesn't translate the
 * result types, just unwraps the `Result<…, Err>` shape and maps
 * field names (singular vs plural, `reservedAmount` vs
 * `consumedAmount`).
 *
 * Notes:
 *   - `consumedAmount` (billing) == `actualCost` (gateway).
 *   - `refundedAmount` from billing is dropped; the gateway only
 *     needs the `reservationId` for tracking.
 */
import type {
  BillingError,
  BillingServices,
  InsufficientCreditsError,
  ReservationExpiredError,
  ReservationNotFoundError,
} from "@openbulls/billing";
import { type Result, err, ok } from "@openbulls/shared";

export function createBillingAdapter(services: BillingServices): IBillingGateway {
  return {
    async reserveCredit(
      input: ReserveCreditInput,
    ): Promise<Result<ReserveCreditResult, InsufficientCreditsError>> {
      const result = await services.reserveCredits({
        userId: input.userId,
        runId: input.runId,
        reservedAmount: input.reservedAmount,
        expiresAt: input.expiresAt,
      });
      if (!result.ok) {
        return err(result.error);
      }
      return ok({
        reservationId: result.value.reservationId as string,
        balanceAfter: result.value.balanceAfter,
      });
    },

    async finalizeUsage(
      input: FinalizeUsageInput,
    ): Promise<
      Result<FinalizeUsageResult, BillingError | ReservationNotFoundError | ReservationExpiredError>
    > {
      const result = await services.finalizeUsage({
        reservationId: input.reservationId,
        consumedAmount: input.actualCost,
      });
      if (!result.ok) {
        return err(result.error);
      }
      return ok({
        reservationId: result.value.reservationId,
        finalCost: result.value.consumed,
        balanceAfter: result.value.balanceAfter,
      });
    },

    async refundReservation(
      input: RefundReservationInput,
    ): Promise<Result<RefundReservationResult, BillingError | ReservationNotFoundError>> {
      const result = await services.refundReservation({
        reservationId: input.reservationId,
        reason: input.reason,
      });
      if (!result.ok) {
        return err(result.error);
      }
      return ok({
        reservationId: result.value.reservationId,
        balanceAfter: result.value.balanceAfter,
      });
    },
  };
}
