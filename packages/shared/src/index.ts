/**
 * @openbulls/shared — cross-cutting primitives.
 *
 * Anything domain-agnostic that more than one package needs lives here.
 * Today: `Result<T, E>` for typed error handling, branded primitive
 * types for nominal IDs and money, and the `AppError` base class.
 *
 * No business logic, no Drizzle, no env access.
 */
export { AppError } from "./errors";
export {
  err,
  flatMap,
  isErr,
  isOk,
  map,
  mapErr,
  ok,
  unwrap,
  unwrapOr,
  type Result,
} from "./result";
export type { Brand } from "./branded";
export {
  CreditAmount,
  MoneyCents,
  ModelKey,
  PlanId,
  ReservationId,
  SubscriptionId,
  UsageEventId,
  UserId,
} from "./branded";
