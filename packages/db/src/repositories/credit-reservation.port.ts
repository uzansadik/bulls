import type { DatabaseOrTx } from "../client";
import type { BillingCreditReservation, ReservationStatus } from "../schema/billing.schema";

/**
 * Reservation creation input — amounts are numeric strings
 * (precision-safe). Caller is responsible for computing
 * `reservedAmount` from model pricing.
 */
export interface CreateReservationInput {
  userId: string;
  runId?: string | null;
  reservedAmount: string;
  expiresAt: Date;
}

/**
 * Status / amount update input. Used for finalize (status + consumed)
 * and refund (status only).
 */
export interface UpdateReservationInput {
  id: string;
  status: ReservationStatus;
  consumedAmount?: string;
}

/**
 * `reserve → finalize → refund` is now orchestrated by billing use
 * cases, not by the repository. The repository is responsible for a
 * single `billing_credit_reservations` row only — ledger entries are
 * appended through `ILedgerRepository`. This keeps each adapter's
 * responsibility narrow and makes the transactional boundary
 * explicit in the use case.
 */
export interface ICreditReservationRepository {
  create(input: CreateReservationInput, tx?: DatabaseOrTx): Promise<BillingCreditReservation>;
  updateStatus(input: UpdateReservationInput, tx?: DatabaseOrTx): Promise<BillingCreditReservation>;
  getById(id: string): Promise<BillingCreditReservation | null>;
  getByRunId(runId: string): Promise<BillingCreditReservation | null>;
}

export type {
  BillingCreditReservation,
  NewBillingCreditReservation,
  ReservationStatus,
} from "../schema/billing.schema";
