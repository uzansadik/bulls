/**
 * Create an admin user from CLI arguments.
 *
 * Usage:
 *   pnpm tsx scripts/create-admin.ts admin@example.com supersecretpassword "Admin"
 */

import { createAdminUser } from "@openbulls/db/seed";

const [emailArg, passwordArg, nameArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
  console.error("Usage: tsx scripts/create-admin.ts <email> <password> [name]");
  process.exit(1);
}

createAdminUser({
  email: emailArg,
  password: passwordArg,
  name: nameArg ?? "Admin",
})
  .then((user) => {
    console.log("[create-admin] done:", user);
    process.exit(0);
  })
  .catch((err) => {
    console.error("[create-admin] failed:", err);
    process.exit(1);
  });
