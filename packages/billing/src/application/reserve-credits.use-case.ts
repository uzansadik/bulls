/**
 * Reserve credits for a future AI run.
 *
 * Atomic flow:
 *   1. Read current wallet balance.
 *   2. If balance < reservedAmount → `InsufficientCreditsError`.
 *   3. Insert reservation row (`status: reserved`).
 *   4. Append ledger entry (`delta: 0`, balance snapshot).
 *
 * The reservation locks credits; actual deduction happens at
 * `finalizeUsage`. If the run never finalizes, sweeper jobs
 * transition stale reservations to `expired` (future work).
 */
import { type DB, withTransaction } from "@openbulls/db/client";
import { type ReservationId, type Result, type UserId, err, ok } from "@openbulls/shared";

import { credits } from "../domain/credits";
import { InsufficientCreditsError } from "../domain/errors";
import type { ICreditReservationRepository } from "../domain/ports/credit-reservation.port";
import type { ILedgerRepository } from "../domain/ports/ledger.port";
import type { IWalletRepository } from "../domain/ports/wallet.port";

export interface ReserveCreditsDeps {
  db: DB;
  reservations: ICreditReservationRepository;
  ledger: ILedgerRepository;
  wallet: IWalletRepository;
}

export interface ReserveCreditsInput {
  userId: UserId | string;
  runId?: string | null;
  reservedAmount: string;
  /** TTL — typically a few hours from `new Date()`. */
  expiresAt: Date;
}

export type ReserveCreditsResult = Result<
  { reservationId: ReservationId; balanceAfter: string },
  InsufficientCreditsError
>;

export async function reserveCredits(
  deps: ReserveCreditsDeps,
  input: ReserveCreditsInput,
): Promise<ReserveCreditsResult> {
  const userId = String(input.userId);
  return withTransaction(async (tx) => {
    const balance = await deps.wallet.getBalance(userId, tx);
    if (!credits.isGte(balance, input.reservedAmount)) {
      return err(
        new InsufficientCreditsError({
          required: input.reservedAmount,
          available: balance,
        }),
      );
    }

    const reservation = await deps.reservations.create(
      {
        userId,
        runId: input.runId ?? null,
        reservedAmount: input.reservedAmount,
        expiresAt: input.expiresAt,
      },
      tx,
    );

    // Reservation itself doesn't deduct — it locks. Balance
    // stays the same; we record this fact in the ledger so
    // downstream queries can reconstruct what happened.
    await deps.ledger.append(
      {
        userId,
        reservationId: reservation.id,
        delta: "0",
        balanceAfter: balance,
        kind: "reservation",
        referenceType: "reservation",
        referenceId: reservation.id,
      },
      tx,
    );

    return ok({
      reservationId: reservation.id as ReservationId,
      balanceAfter: balance,
    });
  });
}
