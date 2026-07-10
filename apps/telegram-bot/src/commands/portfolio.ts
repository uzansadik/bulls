/**
 * apps/telegram-bot — `/portfolio` command.
 *
 * Faz 6 skeleton. Same rationale as `/balance` — the handler is real
 * (the bot actually replies) but the portfolio aggregation lands
 * once the portfolio service is wired into the bot's composition
 * root (Faz 7+).
 */
import type { Context } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

export interface PortfolioCommandDeps {
  readonly logger: LoggerLike;
}

export function makePortfolioHandler(deps: PortfolioCommandDeps): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    deps.logger.info("telegram: /portfolio received", {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
    });
    await ctx.reply(
      "📊 Portfolio snapshot is wired but the live implementation lands in Faz 7 (composition root + portfolio adapter).",
    );
  };
}
