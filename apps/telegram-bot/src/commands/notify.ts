/**
 * apps/telegram-bot — `/notify <on|off|status>` command.
 *
 * Faz 6 skeleton: echoes the requested toggle. The real handler will
 * call `INotificationChannelRepository.setActive(...)` for the user's
 * active telegram channel; the link-token → user mapping required for
 * that lookup lands in the `/start` flow's linking table (Faz 6+.
 * see `start.ts`).
 *
 * Kept in scope for the skeleton so the smoke test can verify the
 * command surface is wired without depending on the link-table yet.
 */
import type { Context } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

export interface NotifyCommandDeps {
  readonly logger: LoggerLike;
}

export function makeNotifyHandler(deps: NotifyCommandDeps): (ctx: Context) => Promise<void> {
  return async (ctx: Context): Promise<void> => {
    const raw = String(ctx.match ?? "status")
      .trim()
      .toLowerCase();
    deps.logger.info("telegram: /notify received", {
      userId: ctx.from?.id,
      mode: raw,
    });

    switch (raw) {
      case "on":
        await ctx.reply("🔔 Notifications will be enabled once /start linking is wired (Faz 6+).");
        return;
      case "off":
        await ctx.reply("🔕 Notifications will be paused once /start linking is wired (Faz 6+).");
        return;
      case "status":
      case "":
        await ctx.reply(
          "🔔 Notify status: pending — link your account via /start to receive alerts.",
        );
        return;
      default:
        await ctx.reply(`Unknown mode "${raw}". Use: /notify on | /notify off | /notify status`);
    }
  };
}
