import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Postgres-js connection (singleton).
 *
 * `max: 10` is a sane default for app + worker processes; tune via env if needed.
 * `prepare: false` is the recommended setting for serverless / edge runtimes.
 */
const connection = postgres(process.env.DATABASE_URL ?? "", {
  max: 10,
  prepare: false,
});

/**
 * Drizzle ORM database instance.
 *
 * Re-exports the barrel schema so `db.query.<table>` and `db.select()` both
 * infer column types automatically. `casing: "snake_case"` mirrors
 * `drizzle.config.ts` so column names match between SQL and TS.
 */
export const db = drizzle(connection, {
  schema,
  casing: "snake_case",
});

export type DB = typeof db;

/**
 * A transaction-scoped client. Functionally identical to `DB` —
 * `withTransaction(async (tx) => { ... })` calls inside the callback
 * share the same underlying connection; any `db.insert/update/select`
 * executed against `DB` is automatically enrolled in the active
 * transaction. Exposed as an alias purely for ergonomic clarity at
 * call sites that distinguish "outside" vs "inside" a transaction.
 */
export type Tx = DB;

/**
 * Either the singleton db connection or a transaction-scoped client.
 * Both expose the same query/insert/update API, so repository
 * methods can accept either without extra runtime branching.
 *
 * Implemented as Drizzle's `PgDatabase<HKT, schema>` supertype —
 * `PostgresJsDatabase` (the `db` singleton) and `PgTransaction` (the
 * `tx` callback parameter) both extend it, so a single type covers
 * both without TS narrowing to the more specific form.
 */
export type DatabaseOrTx = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Transaction wrapper. Use inside repository methods that need atomic
 * multi-step writes (e.g. reserve credit + append ledger entry).
 *
 * @example
 *   await withTransaction(async (tx) => {
 *     await tx.insert(reservations).values(...);
 *     await tx.insert(ledger).values(...);
 *   });
 */
export async function withTransaction<T>(
  fn: (tx: PostgresJsDatabase<typeof schema>) => Promise<T>,
): Promise<T> {
  return db.transaction(fn);
}

/**
 * Close the underlying connection pool. Call from shutdown hooks
 * (SIGTERM handler, test teardown, scripts/reset-db.ts).
 */
export async function closeDb(): Promise<void> {
  await connection.end();
}
