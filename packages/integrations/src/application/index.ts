/**
 * @openbulls/integrations — application barrel.
 *
 * Re-exports the Telegram bot token getter. The application layer
 * holds "thin wrappers around config" — any package wanting the
 * bot token goes through here instead of touching `process.env`
 * directly.
 */

export {
  getTelegramBotToken,
  getTelegramBotUsername,
} from "./telegram-bot-token";
