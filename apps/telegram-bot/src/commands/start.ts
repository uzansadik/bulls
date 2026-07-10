/**
 * apps/telegram-bot — `/start <linkToken>` command.
 *
 * Faz 6 skeleton: parses the optional `linkToken` arg and replies
 * accordingly. The real flow will:
 *   1. Resolve the link token from the auth service.
 *   2. Map `telegramUserId` → `appUserId`.
 *   3. Insert / upsert a `notification_channels` row with
 *      `kind=telegram`, `config={chatId, languageCode}`.
 *
 * Until then, a non-empty token is acknowledged as "linking pending"
 * so smoke tests can verify the command accepts the link-arg shape.
 */
import type { Context } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

export interface StartCommandDeps {
  readonly logger: LoggerLike;
}

export function makeStartHandler(deps: StartCommandDeps): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    const token = String(ctx.match ?? "").trim();
    deps.logger.info("telegram: /start received", {
      userId: ctx.from?.id,
      chatId: ctx.chat?.id,
      hasLinkToken: token.length > 0,
    });

    if (token.length === 0) {
      await ctx.reply(
        "👋 Welcome to Openbulls. Use /start <linkToken> after generating a token from the web app to link your account.",
      );
      return;
    }

    await ctx.reply(
      "🔗 Linking token received. Account binding will complete in Faz 6+ (auth integration).",
    );
  };
}
