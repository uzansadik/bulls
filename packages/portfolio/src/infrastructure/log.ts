/**
 * @openbulls/portfolio — logger helpers.
 *
 * Re-exports the `LoggerLike` port and `noopLogger` constant from
 * `domain/ports/logger.port` for convenience at the composition
 * boundary. Add `pino`-backed adapters here in later phases.
 */
export { noopLogger, type LoggerLike } from "../domain/ports/logger.port";