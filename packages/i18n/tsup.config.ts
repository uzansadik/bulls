import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/config.ts", "src/middleware.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  external: ["next", "next-intl"],
});
