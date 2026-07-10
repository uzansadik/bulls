// @openbulls/telegram-bot — vitest configuration.
// Node env, src/.test.ts glob. Single test file (smoke) in Faz 6
// skeleton — coverage grows as commands gain real behavior.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});