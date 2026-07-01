/**
 * @openbulls/shared — branded (nominal) types.
 *
 * TypeScript's structural typing treats `string` and `string` as the
 * same thing, so passing a `PlanId` where a `UserId` is expected does
 * not raise a type error. Branding fixes this with a phantom tag:
 *
 *     type UserId = Brand<string, "UserId">;
 *
 * `Brand<T, B>` is assignable to and from `T`, but distinct branded
 * types cannot be mixed.
 *
 * The smart constructors below are identity casts — they do not
 * validate input. Validation lives at the boundary (zod schema, DB
 * row, payment gateway response).
 *
 * Each type is exported as both a `type` and a `const` factory with
 * the same name; consumers can write `import { UserId } from "..."`
 * and use it as either a type or a function.
 */
declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & {
  readonly [__brand]: B;
};

// ── Identity branding ─────────────────────────────────────────────────
//
// Below: each line declares one branded type and one factory function
// with the same identifier. The `type` lives in the type space; the
// `const` lives in the value space. Consumers can use them together:
//   import { UserId } from "@openbulls/shared";
//   const id: UserId = UserId("u_abc");

export type UserId = Brand<string, "UserId">;
export const UserId = (s: string): UserId => s as UserId;

export type PlanId = Brand<string, "PlanId">;
export const PlanId = (s: string): PlanId => s as PlanId;

export type SubscriptionId = Brand<string, "SubscriptionId">;
export const SubscriptionId = (s: string): SubscriptionId => s as SubscriptionId;

export type ReservationId = Brand<string, "ReservationId">;
export const ReservationId = (s: string): ReservationId => s as ReservationId;

export type UsageEventId = Brand<string, "UsageEventId">;
export const UsageEventId = (s: string): UsageEventId => s as UsageEventId;

export type ModelKey = Brand<string, "ModelKey">;
export const ModelKey = (s: string): ModelKey => s as ModelKey;

/** Numeric string with 8 decimal places. Caller responsible for normalization. */
export type CreditAmount = Brand<string, "CreditAmount">;
export const CreditAmount = (s: string): CreditAmount => s as CreditAmount;

/** Integer cents (USD/EUR). */
export type MoneyCents = Brand<number, "MoneyCents">;
export const MoneyCents = (n: number): MoneyCents => n as MoneyCents;
