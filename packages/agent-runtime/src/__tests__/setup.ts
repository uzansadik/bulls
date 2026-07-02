/**
 * Vitest setup — runs before every test file. Keeps the surface
 * minimal: global noop logger, fake timer policy, etc.
 */
import { vi } from "vitest";

// Noop logger to keep test output clean. Individual tests can stub
// `console.*` if they want to assert on log output.
globalThis.console = {
  ...console,
  log: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
