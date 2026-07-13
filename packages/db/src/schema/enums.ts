import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Centralized pgEnum definitions for the Openbulls DB schema.
 *
 * Conventions:
 * - Enum name uses snake_case (Postgres identifier).
 * - Allowed values are short, lowercase, kebab-friendly strings.
 * - New enum values require a Drizzle migration (ALTER TYPE ... ADD VALUE).
 *
 * NOTE: `user.role` is intentionally NOT a pgEnum — it stays as `text`
 * with a CHECK constraint (`role in ('admin','user')`) so it stays
 * compatible with Better Auth `additionalFields.role` expectations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Market data
// ─────────────────────────────────────────────────────────────────────────────

export const assetTypeEnum = pgEnum("asset_type", [
  "stock",
  "etf",
  "fund",
  "crypto",
  "fx",
  "commodity",
  "bond",
  "index",
]);

export const marketProviderEnum = pgEnum("market_provider", [
  "kap",
  "sec",
  "yahoo",
  "twelvedata",
  "tcmb",
  "mock",
  "manual",
]);

export const candleIntervalEnum = pgEnum("candle_interval", [
  "1m",
  "5m",
  "15m",
  "30m",
  "1h",
  "4h",
  "1d",
  "1w",
  "1mo",
]);

export const statementTypeEnum = pgEnum("statement_type", [
  "balance_sheet",
  "income_statement",
  "cash_flow",
]);

export const technicalIndicatorTypeEnum = pgEnum("technical_indicator_type", [
  "sma",
  "ema",
  "rsi",
  "macd",
  "bollinger",
  "stochastic",
  "atr",
  "adx",
  "vwap",
  "obv",
  "fibonacci_retracement",
]);
export type TechnicalIndicatorType = (typeof technicalIndicatorTypeEnum.enumValues)[number];
export type StatementType = (typeof statementTypeEnum.enumValues)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio
// ─────────────────────────────────────────────────────────────────────────────

export const transactionSideEnum = pgEnum("transaction_side", [
  "buy",
  "sell",
  "dividend",
  "split",
  "transfer_in",
  "transfer_out",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────────────────

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "paused",
]);

export const paymentProviderEnum = pgEnum("payment_provider", ["stripe", "iyzico", "manual"]);

export const reservationStatusEnum = pgEnum("reservation_status", [
  "reserved",
  "finalized",
  "refunded",
  "expired",
]);

export const creditTxKindEnum = pgEnum("credit_tx_kind", [
  "grant",
  "reservation",
  "finalization",
  "refund",
  "adjustment",
]);

// ─────────────────────────────────────────────────────────────────────────────
// AI / LangGraph
// ─────────────────────────────────────────────────────────────────────────────

export const chatRoleEnum = pgEnum("chat_role", ["system", "user", "assistant", "tool"]);

export const agentRunStatusEnum = pgEnum("agent_run_status", [
  "pending",
  "running",
  "paused",
  "completed",
  "failed",
  "canceled",
]);

export const stepStatusEnum = pgEnum("step_status", [
  "started",
  "succeeded",
  "failed",
  "skipped",
  "awaiting_human",
]);

export const toolCallStatusEnum = pgEnum("tool_call_status", [
  "invoked",
  "succeeded",
  "failed",
  "denied",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Jobs / Automation
// ─────────────────────────────────────────────────────────────────────────────

export const jobExecutorTypeEnum = pgEnum("job_executor_type", [
  "portfolio_daily_review",
  "portfolio_weekly_review",
  "price_alert",
  "news_watch",
  "earnings_calendar_watch",
  "custom_agent",
  "report_render",
]);

export const scheduledJobStatusEnum = pgEnum("scheduled_job_status", [
  "active",
  "paused",
  "deleted",
]);

export const executionStatusEnum = pgEnum("execution_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const queueItemStatusEnum = pgEnum("queue_item_status", [
  "pending",
  "active",
  "completed",
  "failed",
  "delayed",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export const notificationChannelKindEnum = pgEnum("notification_channel_kind", [
  "telegram",
  "web",
  "email",
]);

export const notificationKindEnum = pgEnum("notification_kind", [
  "portfolio_review",
  "price_alert",
  "credit_insufficient",
  "agent_completed",
  "news_watch",
  "earnings_calendar",
  "system",
]);

export const notificationPriorityEnum = pgEnum("notification_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
  "read",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

export const reportTypeEnum = pgEnum("report_type", [
  "portfolio_review",
  "company_analysis",
  "technical_analysis",
  "earnings_summary",
  "custom",
]);

export const reportFormatEnum = pgEnum("report_format", ["pdf", "excel", "markdown"]);

export const reportStatusEnum = pgEnum("report_status", [
  "pending",
  "generating",
  "ready",
  "failed",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Integrations
// ─────────────────────────────────────────────────────────────────────────────

export const integrationProviderEnum = pgEnum("integration_provider", [
  "telegram",
  "stripe",
  "iyzico",
  "kap",
  "sec",
  "yahoo",
  "twelvedata",
  "tcmb",
  "generic",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Type aliases — derived from pgEnum enumValues so repositories and ports
// can type their parameters without re-declaring the string literal union.
// Add a new alias below when introducing a new typed parameter that needs
// the enum's literal values.
// ─────────────────────────────────────────────────────────────────────────────

export type AgentRunStatus = (typeof agentRunStatusEnum.enumValues)[number];
export type StepStatus = (typeof stepStatusEnum.enumValues)[number];
export type ToolCallStatus = (typeof toolCallStatusEnum.enumValues)[number];
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];
export type CreditTxKind = (typeof creditTxKindEnum.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatusEnum.enumValues)[number];
export type PaymentProvider = (typeof paymentProviderEnum.enumValues)[number];
export type TransactionSide = (typeof transactionSideEnum.enumValues)[number];
export type AssetType = (typeof assetTypeEnum.enumValues)[number];
export type MarketProvider = (typeof marketProviderEnum.enumValues)[number];
export type CandleInterval = (typeof candleIntervalEnum.enumValues)[number];
export type ChatRole = (typeof chatRoleEnum.enumValues)[number];
export type NotificationStatus = (typeof notificationStatusEnum.enumValues)[number];
export type JobExecutorType = (typeof jobExecutorTypeEnum.enumValues)[number];
export type ScheduledJobStatus = (typeof scheduledJobStatusEnum.enumValues)[number];
export type ExecutionStatus = (typeof executionStatusEnum.enumValues)[number];
export type QueueItemStatus = (typeof queueItemStatusEnum.enumValues)[number];
