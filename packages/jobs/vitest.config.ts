import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Local config — `@openbulls/jobs` tests run on raw TypeScript via
 * `pnpm -F @openbulls/jobs test` (powered by vitest). The package's
 * barrel is `src/index.ts`; tests under src (with the .test.ts suffix)
 * import directly from sibling files (../application/..., etc.).
 *
 * `passWithNoTests` keeps CI happy when an early commit only sets up
 * the file skeleton but has not yet authored tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@__tests__": path.resolve(__dirname, "./src/__tests__"),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname), path.resolve(__dirname, "../shared/src")],
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: ["**/__tests__/**", "**/*.test.ts", "src/index.ts"],
    },
  },
});
