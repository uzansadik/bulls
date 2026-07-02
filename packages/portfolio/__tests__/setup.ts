/**
 * Vitest setup — boots MSW before every test and tears it down after.
 *
 * Each test file imports `server` from `@/__tests__/setup` to register
 * its own `http.get/post` handlers. Tests that don't touch the
 * network (pure-domain and most application tests with hand-rolled
 * fakes) can ignore this module.
 */
import { afterAll, afterEach, beforeAll } from "vitest";
import { setupServer } from "msw/node";

export const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});