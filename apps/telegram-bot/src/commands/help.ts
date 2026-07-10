/**
 * apps/telegram-bot — `/help` command.
 *
 * Lists the available commands. Kept terse on purpose: Telegram
 * truncates replies beyond 4096 chars and the bot command list is
 * discoverable via Telegram's `/` autocomplete anyway.
 */
import type { Context } from "grammy";

export function makeHelpHandler(): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    await ctx.reply(
      [
        "*Openbulls bot — available commands*",
        "",
        "/start \\[linkToken] — link your Telegram to your Openbulls account",
        "/balance — show your current credit balance",
        "/portfolio — show your portfolio snapshot",
        "/analyze \\<SYMBOL\\> — request an analysis (e.g. /analyze THYAO)",
        "/notify on|off|status — toggle or inspect alerts",
        "/help — show this message",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
  };
}
