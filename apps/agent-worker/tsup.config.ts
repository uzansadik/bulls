import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
  clean: true,
  target: "es2022",
  // apps/agent-worker is a process entry — no dts emit needed.
  dts: false,
});