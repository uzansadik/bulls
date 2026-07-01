/**
 * Apply pending Drizzle migrations against $DATABASE_URL.
 *
 * Usage:
 *   pnpm tsx scripts/migrate.ts
 *
 * Implementation lives in packages/db; this is a thin wrapper.
 */

import { runMigrate } from "@openbulls/db";

runMigrate()
  .then((applied) => {
    if (applied.length === 0) {
      console.log("[migrate] no pending migrations");
    } else {
      console.log(`[migrate] applied ${applied.length} migration(s):`);
      for (const m of applied) console.log(`  - ${m}`);
    }
    process.exit(0);
  })
  .catch((err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
