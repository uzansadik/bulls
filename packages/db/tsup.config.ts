import { defineConfig } from "tsup";

/**
 * @openbulls/db — full ESM bundle + .d.ts.
 *
 * The package depends on `drizzle-orm` and `postgres`. Bundling it
 * keeps a single connection pool per process and avoids accidental
 * double-init across consumers. Consumers import from `dist/*` via
 * `package.json#exports`.
 *
 * `entry` lists every file the consumers actually import
 * (`./client`, `./schema/*`, `./repositories/*`, `./seed`) so each
 * subpath is emitted as its own bundle. Files are bundled together
 * but the consumer only pays for the chunk that ships.
 */
const entries = [
  "src/index.ts",
  "src/client.ts",
  "src/seed.ts",
  "src/schema/index.ts",
  "src/repositories/index.ts",
];

export default defineConfig({
  entry: entries,
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["drizzle-orm", "postgres", "drizzle-orm/pg-core"],
});