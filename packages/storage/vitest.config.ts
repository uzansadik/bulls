// @openbulls/storage — vitest configuration.
// Node env; tests mock the AWS SDK S3Client (no real S3 calls).
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});