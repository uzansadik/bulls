/**
 * Refund an unused (or partially-used) reservation.
 *
 * Returns the locked-but-unspent amount to the user's wallet:
 *   refunded = reservedAmount − consumedAmount
 *
 * Atomic flow:
 *   1. Fetch reservation.
 *   2. Compute refund.
 *   3. Update reservation to `status: refunded`.
 *   4. Append ledger entry with positive delta.
 */
import { type DB, withTransaction } from "@openbulls/db/client";
import { type Result, err, ok } from "@openbulls/shared";

import { credits } from "../domain/credits";
import { BillingError, ReservationNotFoundError } from "../domain/errors";
import type { ICreditReservationRepository } from "../domain/ports/credit-reservation.port";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";

export interface RefundReservationDeps {
  db: DB;
  reservations: ICreditReservationRepository;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
}

export interface RefundReservationInput {
  reservationId: string;
  reason?: string;
}

export type RefundReservationResult = Result<
  {
    reservationId: string;
    refundedAmount: string;
    balanceAfter: string;
  },
  ReservationNotFoundError | BillingError
>;

export async function refundReservation(
  deps: RefundReservationDeps,
  input: RefundReservationInput,
): Promise<RefundReservationResult> {
  return withTransaction(async (tx) => {
    const reservation = await deps.reservations.getById(input.reservationId);
    if (!reservation) {
      return err(new ReservationNotFoundError(input.reservationId));
    }
    if (reservation.status === "refunded") {
      return err(new BillingError(`reservation ${input.reservationId} already refunded`));
    }

    const refunded = credits.sub(reservation.reservedAmount, reservation.consumedAmount);

    await deps.reservations.updateStatus({ id: reservation.id, status: "refunded" }, tx);

    const balance = await deps.wallet.getBalance(reservation.userId, tx);
    const newBalance = credits.add(balance, refunded);

    await deps.ledger.append(
      {
        userId: reservation.userId,
        reservationId: reservation.id,
        delta: refunded,
        balanceAfter: newBalance,
        kind: "refund",
        referenceType: "reservation",
        referenceId: reservation.id,
        notes: input.reason ?? null,
      },
      tx,
    );

    return ok({
      reservationId: reservation.id,
      refundedAmount: refunded,
      balanceAfter: newBalance,
    });
  });
}
