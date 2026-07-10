/**
 * apps/telegram-bot — Bot composition.
 *
 * Builds a grammy `Bot` instance, registers all commands, and
 * returns the handle. The entrypoint (`index.ts`) decides whether
 * to `bot.start()` for long-polling or wire it to a webhook server.
 *
 * Commands are passed in as already-built handlers — this keeps
 * `bot.ts` free of side effects and trivial to unit-test (pass
 * stub handlers, register them, assert they fire on synthetic
 * updates).
 */
import { Bot } from "grammy";

import type { LoggerLike } from "@openbulls/logger";

import { type AnalyzeCommandDeps, makeAnalyzeHandler } from "./commands/analyze";
import { type BalanceCommandDeps, makeBalanceHandler } from "./commands/balance";
import { makeHelpHandler } from "./commands/help";
import { type NotifyCommandDeps, makeNotifyHandler } from "./commands/notify";
import { type PortfolioCommandDeps, makePortfolioHandler } from "./commands/portfolio";
import { type StartCommandDeps, makeStartHandler } from "./commands/start";

/**
 * Subset of `getMe` response fields that grammy accepts as
 * `botInfo` in the constructor. Not exported from grammy, so we
 * type the surface inline.
 */
export interface BotInfo {
  readonly id: number;
  readonly is_bot: true;
  readonly first_name: string;
  readonly username: string;
  readonly can_join_groups: boolean;
  readonly can_read_all_group_messages: boolean;
  readonly supports_inline_queries: boolean;
}

export interface BotDeps {
  readonly token: string;
  readonly logger: LoggerLike;
  /**
   * Optional `botInfo` — used in tests to skip the network call
   * (`bot.init()`). Production callers omit it; grammy fetches the
   * info lazily on first `handleUpdate`.
   */
  readonly botInfo?: BotInfo;
}

export interface CommandDeps {
  readonly start: StartCommandDeps;
  readonly balance: BalanceCommandDeps;
  readonly portfolio: PortfolioCommandDeps;
  readonly analyze: AnalyzeCommandDeps;
  readonly notify: NotifyCommandDeps;
}

const TEST_BOT_INFO: BotInfo = {
  id: 999_999,
  is_bot: true,
  first_name: "OpenbullsTestBot",
  username: "openbulls_test_bot",
  can_join_groups: true,
  can_read_all_group_messages: true,
  supports_inline_queries: false,
};

/**
 * Construct a grammy `Bot` with the full command surface. The caller
 * is responsible for `bot.start()` / webhook wiring.
 */
export function createBot(deps: BotDeps, commandDeps: CommandDeps): Bot {
  const bot = deps.botInfo
    ? new Bot(deps.token, { botInfo: deps.botInfo as never })
    : new Bot(deps.token);

  bot.command("start", makeStartHandler(commandDeps.start));
  bot.command("balance", makeBalanceHandler(commandDeps.balance));
  bot.command("portfolio", makePortfolioHandler(commandDeps.portfolio));
  bot.command("analyze", makeAnalyzeHandler(commandDeps.analyze));
  bot.command("notify", makeNotifyHandler(commandDeps.notify));
  bot.command("help", makeHelpHandler());

  deps.logger.info("telegram-bot: commands registered", {
    commands: ["start", "balance", "portfolio", "analyze", "notify", "help"],
  });

  return bot;
}

export { TEST_BOT_INFO };
