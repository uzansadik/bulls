import { defineConfig } from "vitest/config";

/**
 * Local config — uses the package's own `src/` directly (no build step
 * for tests). Node environment so we can exercise the real `fetch`
 * with MSW intercepting outbound requests.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      exclude: ["**/__tests__/**", "**/*.test.ts", "src/index.ts"],
    },
  },
});
