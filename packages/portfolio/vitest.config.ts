import { defineConfig } from "vitest/config";

/**
 * Local config — uses the package's own `src/` directly (no build step
 * for tests). Node environment; MSW intercepts outbound fetches for
 * the market-data gateway in tests that need it. Pure-domain tests
 * run without MSW (no network).
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
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