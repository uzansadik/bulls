/**
 * Vitest setup — boots MSW before every test and tears it down after.
 *
 * Each test file imports `server` from `@/__tests__/setup` to register
 * its own `http.get/post` handlers. The fetches inside adapters go
 * through MSW instead of the real network.
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
