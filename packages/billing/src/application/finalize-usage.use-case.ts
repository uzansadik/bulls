/**
 * Finalize a reservation: charge the user for the consumed amount.
 *
 * Atomic flow:
 *   1. Fetch reservation.
 *   2. Update reservation to `status: finalized`, set
 *      `consumed_amount`.
 *   3. Append ledger entry with `delta = -consumedAmount`.
 *   4. New balance = current balance − consumed.
 *
 * Returns the new balance after the charge.
 */
import { type DB, withTransaction } from "@openbulls/db/client";
import { type Result, err, ok } from "@openbulls/shared";

import { credits } from "../domain/credits";
import { BillingError, ReservationNotFoundError } from "../domain/errors";
import type { ICreditReservationRepository } from "../domain/ports/credit-reservation.port";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";

export interface FinalizeUsageDeps {
  db: DB;
  reservations: ICreditReservationRepository;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
}

export interface FinalizeUsageInput {
  reservationId: string;
  consumedAmount: string;
  notes?: string;
}

export type FinalizeUsageResult = Result<
  { reservationId: string; balanceAfter: string; consumed: string },
  ReservationNotFoundError | BillingError
>;

export async function finalizeUsage(
  deps: FinalizeUsageDeps,
  input: FinalizeUsageInput,
): Promise<FinalizeUsageResult> {
  return withTransaction(async (tx) => {
    const reservation = await deps.reservations.getById(input.reservationId);
    if (!reservation) {
      return err(new ReservationNotFoundError(input.reservationId));
    }
    if (reservation.status !== "reserved") {
      return err(
        new BillingError(
          `reservation ${input.reservationId} cannot be finalized in status ${reservation.status}`,
        ),
      );
    }

    await deps.reservations.updateStatus(
      {
        id: reservation.id,
        status: "finalized",
        consumedAmount: input.consumedAmount,
      },
      tx,
    );

    const balance = await deps.wallet.getBalance(reservation.userId, tx);
    const newBalance = credits.sub(balance, input.consumedAmount);

    await deps.ledger.append(
      {
        userId: reservation.userId,
        reservationId: reservation.id,
        delta: credits.sub("0", input.consumedAmount), // negative
        balanceAfter: newBalance,
        kind: "finalization",
        referenceType: "reservation",
        referenceId: reservation.id,
        notes: input.notes ?? null,
      },
      tx,
    );

    return ok({
      reservationId: reservation.id,
      balanceAfter: newBalance,
      consumed: input.consumedAmount,
    });
  });
}
