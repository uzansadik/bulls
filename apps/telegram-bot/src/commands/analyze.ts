/**
 * apps/telegram-bot — `/analyze <SYMBOL>` command.
 *
 * Faz 6 skeleton: validates the arg shape, replies with a placeholder.
 * A future iteration will route the request through the agent
 * runtime (likely `enqueueAgentRun({ graphKey: "company-analysis", input })`
 * and a follow-up message when the run completes).
 *
 * Argument validation is enforced today so the surface stays stable
 * once the real handler lands — silent arg-shape drift is the #1
 * cause of UX bugs in chat UIs.
 */
import type { Context } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

export interface AnalyzeCommandDeps {
  readonly logger: LoggerLike;
}

const SYMBOL_PATTERN = /^[A-Z0-9.\-]{1,12}$/;

export function makeAnalyzeHandler(deps: AnalyzeCommandDeps): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    const raw = String(ctx.match ?? "").trim();
    deps.logger.info("telegram: /analyze received", {
      userId: ctx.from?.id,
      symbol: raw,
    });

    if (raw.length === 0) {
      await ctx.reply("Usage: /analyze <SYMBOL> (e.g. /analyze THYAO)");
      return;
    }
    if (!SYMBOL_PATTERN.test(raw)) {
      await ctx.reply(`Invalid symbol "${raw}". Use 1-12 chars: A-Z, 0-9, dot, dash.`);
      return;
    }

    await ctx.reply(
      `🔎 Analysis request for *${raw}* received. Live agent dispatch lands in Faz 7.`,
    );
  };
}
