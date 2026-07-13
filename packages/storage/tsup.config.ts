// @openbulls/storage — tsup bundler config.
// Single ESM bundle; the AWS SDK pulls in `node:crypto` so we keep
// the target on es2022 + node (not browser). Dev runs `vitest`
// directly against source via tsx/ts-node; production deploys use
// `dist/index.js`.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  clean: true,
  dts: false,
  sourcemap: true,
  external: ["@aws-sdk/*"],
});