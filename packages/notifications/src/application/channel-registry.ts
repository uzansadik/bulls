/**
 * @openbulls/notifications — channel registry.
 *
 * Single source of truth for "which sender handles which `ChannelKind`".
 * Process-local. The composition root (`infrastructure/composition.ts`)
 * builds a default registry at boot with all enabled senders.
 *
 * Mirrors `@openbulls/automation`'s `InMemoryExecutorRegistry`:
 *   - `register(sender)` — throws `ExecutorAlreadyRegisteredError`
 *     analog (`ChannelKindAlreadyRegisteredError`) on duplicate.
 *   - `get(kind)` — returns `undefined` for unknown kinds; the
 *     dispatcher treats that as "skip + log" (the only way to surface
 *     it would be to retry a kind we *know* we cannot deliver).
 *   - `list()` — frozen snapshot, used by the ops query.
 */
import type { ChannelKind } from "../domain";
import { ChannelKindNotRegisteredError } from "../domain";
import type { IChannelSender } from "./channels/ports";

export class ChannelKindAlreadyRegisteredError extends Error {
  readonly code = "notifications/channel-kind-already-registered" as const;
  constructor(
    message: string,
    readonly data: { readonly channelKind: ChannelKind },
  ) {
    super(message);
  }
}

export interface IChannelRegistry {
  register<T extends ChannelKind>(sender: IChannelSender<never>): void;
  get(kind: ChannelKind): IChannelSender<never> | undefined;
  has(kind: ChannelKind): boolean;
  list(): readonly IChannelSender<never>[];
}

export class InMemoryChannelRegistry implements IChannelRegistry {
  readonly #senders: Map<ChannelKind, IChannelSender<never>>;

  constructor(seed: readonly IChannelSender<never>[] = []) {
    this.#senders = new Map();
    for (const sender of seed) {
      this.register(sender);
    }
  }

  register<T extends ChannelKind>(sender: IChannelSender<never>): void {
    const existing = this.#senders.get(sender.kind);
    if (existing) {
      throw new ChannelKindAlreadyRegisteredError(
        `channel sender already registered for kind=${sender.kind}`,
        { channelKind: sender.kind },
      );
    }
    this.#senders.set(sender.kind, sender);
  }

  get(kind: ChannelKind): IChannelSender<never> | undefined {
    return this.#senders.get(kind);
  }

  has(kind: ChannelKind): boolean {
    return this.#senders.has(kind);
  }

  list(): readonly IChannelSender<never>[] {
    return Object.freeze(Array.from(this.#senders.values()));
  }
}