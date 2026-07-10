// @openbulls/reports — tsup bundler config.
// Single ESM bundle; rendering libs (handlebars / pdfkit / exceljs)
// are added in Faz 7.3 and will be tree-shaken or externalized
// here as they come online.
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  clean: true,
  dts: false,
  sourcemap: true,
});