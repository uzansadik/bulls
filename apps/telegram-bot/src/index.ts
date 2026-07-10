/**
 * apps/telegram-bot — process entrypoint.
 *
 * Boot sequence:
 *   1. Read server env (TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME).
 *   2. Build the bot via `createBot` (long-polling in Faz 6).
 *   3. Start heartbeat + bot.start().
 *   4. SIGTERM / SIGINT → bot.stop() and exit.
 *
 * Linking flow, channel CRUD, and agent dispatch are wired in
 * subsequent PRs (Faz 6+ for linking, Faz 7+ for live commands).
 */
import { serverEnv } from "@openbulls/config";
import { logger as pinoLogger } from "@openbulls/logger";

import { type CommandDeps, createBot } from "./bot";

async function main(): Promise<void> {
  const env = serverEnv();
  pinoLogger.info(
    {
      username: env.TELEGRAM_BOT_USERNAME,
      webhook: env.TELEGRAM_WEBHOOK_URL ?? "(long-polling)",
    },
    "telegram-bot: booting",
  );

  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is required for apps/telegram-bot");
  }

  const commandDeps: CommandDeps = {
    start: { logger: pinoLogger },
    balance: { logger: pinoLogger },
    portfolio: { logger: pinoLogger },
    analyze: { logger: pinoLogger },
    notify: { logger: pinoLogger },
  };

  const bot = createBot({ token: env.TELEGRAM_BOT_TOKEN, logger: pinoLogger }, commandDeps);

  let stopping = false;
  const stop = async (signal: string): Promise<void> => {
    if (stopping) return;
    stopping = true;
    pinoLogger.info({ signal }, "telegram-bot: shutting down");
    try {
      await bot.stop();
    } catch (err) {
      pinoLogger.error({ err: String(err) }, "telegram-bot: shutdown failed");
    }
    process.exit(0);
  };
  process.on("SIGTERM", () => void stop("SIGTERM"));
  process.on("SIGINT", () => void stop("SIGINT"));

  await bot.start();
}

main().catch((err: unknown) => {
  pinoLogger.fatal({ err: String(err) }, "telegram-bot: fatal");
  process.exit(1);
});
