/**
 * Seed the local DB with baseline data:
 *  - admin user (email + password printed to stdout)
 *  - default plan rows
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   pnpm tsx scripts/seed.ts
 */

import { seedDatabase } from "@openbulls/db/seed";

seedDatabase()
  .then((report) => {
    console.log("[seed] done");
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  })
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exit(1);
  });
