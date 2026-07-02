import { readdirSync } from "node:fs";
import { defineConfig } from "tsup";

/**
 * @openbulls/db — full ESM bundle + .d.ts.
 *
 * The package depends on `drizzle-orm` and `postgres`. Bundling it
 * keeps a single connection pool per process and avoids accidental
 * double-init across consumers. Consumers import from `dist/*` via
 * `package.json#exports`.
 *
 * `entry` enumerates every file the consumers actually import
 * (`./client`, `./schema/*`, `./repositories/*`, `./seed`) so each
 * subpath is emitted as its own bundle. Subpath consumers (e.g.
 * `@openbulls/db/schema/auth.schema`) require the individual *.schema
 * file to land in `dist/schema/`, so we glob the source directory at
 * build time rather than hard-coding one barrel.
 */

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".ts"))
    .map((d) => `${dir}/${d.name}`)
    .sort();
}

const entries = [
  "src/index.ts",
  "src/client.ts",
  "src/seed.ts",
  ...listTs("src/schema"),
  ...listTs("src/repositories"),
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