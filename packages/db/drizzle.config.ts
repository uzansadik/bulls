import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration for @openbulls/db.
 * `dialect: postgresql` matches packages/auth drizzleAdapter provider pg.
 * `casing: snake_case` maps camelCase TS field names to snake_case columns.
 * `schema: ./src/schema` scans the directory; only files exporting pgTable/pgEnum
 * are picked up (helpers and ports ignored automatically).
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema",
  out: "./src/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});