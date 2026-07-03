import { ExecutorAlreadyRegisteredError } from "../domain/errors";
import type { IExecutor } from "../domain/executor";
/**
 * @openbulls/automation — executor registry.
 *
 * Single source of truth for "which executor handles which
 * `ExecutorType`". The default registry lives in memory; production
 * uses `InMemoryExecutorRegistry` and the cron process boots with
 * `createDefaultExecutorRegistry()` (see `infrastructure/default-registry.factory.ts`).
 *
 * The registry is intentionally process-local. A multi-region or
 * multi-tenant deployment builds a *new* registry per process
 * (Faz 8+); the registry never crosses the network.
 *
 * Why an interface and not just a `Map<ExecutorType, IExecutor>`:
 *   - Pinning to a type gives us a single registration API
 *     (`register(executor)`) instead of `map.set(type, executor)` —
 *     less typo surface, and the duplicate-detection logic stays in
 *     one place.
 *   - `list()` returns a frozen snapshot, preventing callers from
 *     mutating the registry through the public surface.
 *   - Tests can swap the registry implementation cleanly; the
 *     `IExecutorRegistry` port is the boundary the dispatcher uses.
 */
import type { ExecutorType } from "../domain/job-definition";

/**
 * Registry port — what the dispatcher and the (future) admin tool
 * depend on. Concrete impls live alongside (`in-memory-executor-registry.ts`).
 */
export interface IExecutorRegistry {
  /**
   * Register a single executor. Throws `ExecutorAlreadyRegisteredError`
   * if an executor for the same type has already been registered.
   * Order is significant only for `list()` — the dispatcher does not
   * iterate the registry, so registration order is informational.
   */
  register<T>(executor: IExecutor<T>): void;
  /**
   * Look up an executor by type. Returns `undefined` when the type is
   * unknown — the dispatcher converts that into a `skipped` execution.
   */
  get(type: ExecutorType): IExecutor | undefined;
  has(type: ExecutorType): boolean;
  /**
   * Frozen snapshot of registered executors. Used by the ops
   * `listExecutors` query; never mutated by callers.
   */
  list(): readonly IExecutor[];
}

/**
 * In-process implementation. Cheap, no allocation per call. Insertion
 * order preserved for `list()` so diagnostic output is stable.
 */
export class InMemoryExecutorRegistry implements IExecutorRegistry {
  readonly #executors: Map<ExecutorType, IExecutor>;

  constructor(seed: readonly IExecutor[] = []) {
    this.#executors = new Map();
    for (const executor of seed) {
      this.register(executor);
    }
  }

  register<T>(executor: IExecutor<T>): void {
    const existing = this.#executors.get(executor.type);
    if (existing) {
      throw new ExecutorAlreadyRegisteredError(
        `executor already registered for type=${executor.type}`,
        { executorType: executor.type },
      );
    }
    this.#executors.set(executor.type, executor as unknown as IExecutor);
  }

  get(type: ExecutorType): IExecutor | undefined {
    return this.#executors.get(type);
  }

  has(type: ExecutorType): boolean {
    return this.#executors.has(type);
  }

  list(): readonly IExecutor[] {
    return Object.freeze(Array.from(this.#executors.values()));
  }
}
