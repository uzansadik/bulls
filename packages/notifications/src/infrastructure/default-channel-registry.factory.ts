/**
 * @openbulls/notifications — default channel registry factory.
 *
 * Registers every enabled channel sender (telegram in Faz 6; email +
 * web push in Faz 8) against a fresh `InMemoryChannelRegistry`. The
 * agent-worker process and the future admin tool both call this at
 * boot so the same set of senders is wired in both contexts.
 */
import type { Bot } from "grammy";

import type { IChannelRegistry } from "../application/channel-registry";
import { InMemoryChannelRegistry } from "../application/channel-registry";

import { TelegramChannelSender } from "./channels/telegram.channel";

export interface CreateDefaultChannelRegistryInput {
  /** Optional pre-built grammy Bot (e.g. for tests). */
  readonly telegramBot?: Bot;
}

export function createDefaultChannelRegistry(
  input: CreateDefaultChannelRegistryInput = {},
): IChannelRegistry {
  const registry = new InMemoryChannelRegistry();
  registry.register(
    new TelegramChannelSender(input.telegramBot ? { bot: input.telegramBot } : {}),
  );
  return registry;
}