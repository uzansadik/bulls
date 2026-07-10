/**
 * apps/telegram-bot — `/balance` command.
 *
 * Faz 6 skeleton: replies with a placeholder telling the user the
 * command is wired but the live balance query lands in Faz 7+ once
 * the portfolio + market-data adapters are reachable from the bot
 * process. Keeping the registration real (not a stub function) so
 * the smoke test can verify the bot exposes the command.
 */
import type { Context } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

export interface BalanceCommandDeps {
  readonly logger: LoggerLike;
}

export function makeBalanceHandler(deps: BalanceCommandDeps): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    deps.logger.info("telegram: /balance received", {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });
    await ctx.reply(
      "💰 Balance query is wired but the live implementation lands in Faz 7 (portfolio + market-data adapters).",
    );
  };
}
