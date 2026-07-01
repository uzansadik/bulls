/**
 * @openbulls/shared — `Result<T, E>` discriminated union.
 *
 * Use cases return `Result<T, E>` instead of throwing. Infrastructure
 * failures (DB errors, network errors) still throw — they bubble up to
 * the route handler. Domain errors get wrapped into the `error` arm.
 *
 * Helper functions are exported alongside the type:
 *   - `ok(value)` / `err(error)` — construct
 *   - `isOk(r)` / `isErr(r)` — narrow
 *   - `map`, `mapErr`, `flatMap` — transform
 *   - `unwrap`, `unwrapOr` — extract value (panic on `err`)
 *
 * `unwrap` is intentionally unsafe — only use it where the prior
 * `isOk` check is statically certain.
 */
import type { AppError } from "./errors";

export type Result<T, E extends AppError = AppError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({
  ok: true,
  value,
});

export const err = <E extends AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export function isOk<T, E extends AppError>(
  r: Result<T, E>,
): r is { readonly ok: true; readonly value: T } {
  return r.ok;
}

export function isErr<T, E extends AppError>(
  r: Result<T, E>,
): r is { readonly ok: false; readonly error: E } {
  return !r.ok;
}

export function map<T, U, E extends AppError>(r: Result<T, E>, f: (t: T) => U): Result<U, E> {
  return r.ok ? ok(f(r.value)) : r;
}

export function mapErr<T, E extends AppError, F extends AppError>(
  r: Result<T, E>,
  f: (e: E) => F,
): Result<T, F> {
  return r.ok ? r : err(f(r.error));
}

export function flatMap<T, U, E extends AppError>(
  r: Result<T, E>,
  f: (t: T) => Result<U, E>,
): Result<U, E> {
  return r.ok ? f(r.value) : r;
}

/** Panic on `err`. Use only when an earlier `isOk` check guarantees success. */
export function unwrap<T, E extends AppError>(r: Result<T, E>): T {
  if (r.ok) return r.value;
  throw r.error;
}

export function unwrapOr<T, E extends AppError>(r: Result<T, E>, fallback: T): T {
  return r.ok ? r.value : fallback;
}
