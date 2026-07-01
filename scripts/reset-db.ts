/**
 * Drop and recreate the local DB schema.
 *
 * DESTRUCTIVE — never run against a non-local DB.
 * Refuses to execute if NODE_ENV === "production".
 *
 * Usage:
 *   pnpm tsx scripts/reset-db.ts
 */

if (process.env.NODE_ENV === "production") {
  console.error("[reset-db] refusing to run in production");
  process.exit(1);
}

import { resetDatabase } from "@openbulls/db/seed";

resetDatabase()
  .then(() => {
    console.log("[reset-db] done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[reset-db] failed:", err);
    process.exit(1);
  });
