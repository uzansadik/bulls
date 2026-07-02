/**
 * Vitest setup — silence noisy pino output in unit tests.
 *
 * The agent-worker uses pino for production logging. Tests pass a
 * `noopLogger` so the test output stays focused on assertions, not
 * log lines.
 */
