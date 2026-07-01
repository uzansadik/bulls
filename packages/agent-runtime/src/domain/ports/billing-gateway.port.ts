import type {
  BillingError,
  InsufficientCreditsError,
  ReservationExpiredError,
  ReservationNotFoundError,
} from "@openbulls/billing";
/**
 * @openbulls/agent-runtime — billing gateway port.
 *
 * Subgraph nodes (`reserve-credit`, `finalize-usage`,
 * `pause-credit-insufficient`) talk to billing through this narrow
 * port rather than importing `packages/billing` directly. Tests swap
 * a spy that records calls and returns scripted outcomes.
 */
import type { Result } from "@openbulls/shared";

export interface ReserveCreditInput {
  readonly userId: string;
  readonly runId: string;
  readonly reservedAmount: string;
  /** TTL — typically a few hours from `new Date()`. */
  readonly expiresAt: Date;
}

export interface ReserveCreditResult {
  readonly reservationId: string;
  readonly balanceAfter: string;
}

export interface FinalizeUsageInput {
  readonly reservationId: string;
  readonly actualCost: string;
}

export interface FinalizeUsageResult {
  readonly reservationId: string;
  readonly finalCost: string;
  readonly balanceAfter: string;
}

export interface RefundReservationInput {
  readonly reservationId: string;
  readonly reason: string;
}

export interface RefundReservationResult {
  readonly reservationId: string;
  readonly balanceAfter: string;
}

export interface IBillingGateway {
  reserveCredit(
    input: ReserveCreditInput,
  ): Promise<Result<ReserveCreditResult, InsufficientCreditsError>>;

  finalizeUsage(
    input: FinalizeUsageInput,
  ): Promise<
    Result<FinalizeUsageResult, BillingError | ReservationNotFoundError | ReservationExpiredError>
  >;

  refundReservation(
    input: RefundReservationInput,
  ): Promise<Result<RefundReservationResult, BillingError | ReservationNotFoundError>>;
}
