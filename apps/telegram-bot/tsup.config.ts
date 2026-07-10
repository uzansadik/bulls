// @openbulls/telegram-bot — tsup bundler config.
// Single ESM bundle; tree-shakes grammy. Used by `pnpm build` for
// production deploys; dev runs `tsx watch` directly.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  clean: true,
  dts: false,
  sourcemap: true,
});