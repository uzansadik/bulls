// @openbulls/notifications — vitest configuration.
// Mirrors the automation package: node env, src/.test.ts glob,
// single setup file for future hooks (mock cleanup, log silencing).
// Tests needing persistence mock INotificationRepository directly —
// no pg-mem fixture in this package yet.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});