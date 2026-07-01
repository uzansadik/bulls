CREATE TYPE "public"."agent_run_status" AS ENUM('pending', 'running', 'paused', 'completed', 'failed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('stock', 'etf', 'fund', 'crypto', 'fx', 'commodity', 'bond', 'index');--> statement-breakpoint
CREATE TYPE "public"."candle_interval" AS ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1mo');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."credit_tx_kind" AS ENUM('grant', 'reservation', 'finalization', 'refund', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('telegram', 'stripe', 'iyzico', 'kap', 'sec', 'yahoo', 'twelvedata', 'tcmb', 'generic');--> statement-breakpoint
CREATE TYPE "public"."job_executor_type" AS ENUM('portfolio_daily_review', 'portfolio_weekly_review', 'price_alert', 'news_watch', 'earnings_calendar_watch', 'custom_agent');--> statement-breakpoint
CREATE TYPE "public"."market_provider" AS ENUM('kap', 'sec', 'yahoo', 'twelvedata', 'tcmb', 'mock', 'manual');--> statement-breakpoint
CREATE TYPE "public"."notification_channel_kind" AS ENUM('telegram', 'web', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_kind" AS ENUM('portfolio_review', 'price_alert', 'credit_insufficient', 'agent_completed', 'news_watch', 'earnings_calendar', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'read');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('stripe', 'iyzico', 'manual');--> statement-breakpoint
CREATE TYPE "public"."queue_item_status" AS ENUM('pending', 'active', 'completed', 'failed', 'delayed');--> statement-breakpoint
CREATE TYPE "public"."report_format" AS ENUM('pdf', 'excel', 'markdown');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'generating', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."report_type" AS ENUM('portfolio_review', 'company_analysis', 'technical_analysis', 'earnings_summary', 'custom');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('reserved', 'finalized', 'refunded', 'expired');--> statement-breakpoint
CREATE TYPE "public"."scheduled_job_status" AS ENUM('active', 'paused', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."statement_type" AS ENUM('balance_sheet', 'income_statement', 'cash_flow');--> statement-breakpoint
CREATE TYPE "public"."step_status" AS ENUM('started', 'succeeded', 'failed', 'skipped', 'awaiting_human');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'paused');--> statement-breakpoint
CREATE TYPE "public"."technical_indicator_type" AS ENUM('sma', 'ema', 'rsi', 'macd', 'bollinger', 'stochastic', 'atr', 'adx', 'vwap', 'obv', 'fibonacci_retracement');--> statement-breakpoint
CREATE TYPE "public"."tool_call_status" AS ENUM('invoked', 'succeeded', 'failed', 'denied');--> statement-breakpoint
CREATE TYPE "public"."transaction_side" AS ENUM('buy', 'sell', 'dividend', 'split', 'transfer_in', 'transfer_out');--> statement-breakpoint
CREATE TABLE "agent_graph_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"checkpoint_id" varchar(128) NOT NULL,
	"node_key" varchar(64) NOT NULL,
	"state" jsonb NOT NULL,
	"next_nodes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_run_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"node_key" varchar(64) NOT NULL,
	"subagent_key" varchar(64),
	"status" "step_status" NOT NULL,
	"attempt" smallint DEFAULT 1 NOT NULL,
	"input_snapshot" jsonb,
	"output_snapshot" jsonb,
	"error" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"graph_key" varchar(64) NOT NULL,
	"thread_id" varchar(128) NOT NULL,
	"status" "agent_run_status" NOT NULL,
	"current_node_key" varchar(64),
	"input" jsonb NOT NULL,
	"output" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"paused_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tool_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"step_id" uuid NOT NULL,
	"tool_key" varchar(64) NOT NULL,
	"args" jsonb NOT NULL,
	"result" jsonb,
	"status" "tool_call_status" NOT NULL,
	"error" text,
	"invoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"run_id" uuid,
	"step_id" uuid,
	"model_key" varchar(64) NOT NULL,
	"provider" varchar(32) NOT NULL,
	"input_tokens" smallint DEFAULT 0 NOT NULL,
	"output_tokens" smallint DEFAULT 0 NOT NULL,
	"latency_ms" smallint,
	"raw_usage" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"tool_call_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text,
	"model_key" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" text DEFAULT 'false' NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" text DEFAULT 'false' NOT NULL,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_role_check" CHECK ("user"."role" IN ('admin', 'user'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_name" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "queue_item_status" NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"max_attempts" smallint DEFAULT 5 NOT NULL,
	"locked_by" varchar(64),
	"locked_until" timestamp with time zone,
	"last_error" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_job_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"agent_run_id" uuid,
	"status" "execution_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "user_scheduled_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"executor_type" "job_executor_type" NOT NULL,
	"cron" varchar(64) NOT NULL,
	"timezone" varchar(64) DEFAULT 'Europe/Istanbul' NOT NULL,
	"input_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "scheduled_job_status" NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_credit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"run_id" uuid,
	"reserved_amount" numeric(20, 8) NOT NULL,
	"consumed_amount" numeric(20, 8) DEFAULT '0' NOT NULL,
	"status" "reservation_status" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reservation_id" uuid,
	"plan_id" uuid,
	"delta" numeric(20, 8) NOT NULL,
	"balance_after" numeric(20, 8) NOT NULL,
	"kind" "credit_tx_kind" NOT NULL,
	"reference_type" varchar(32),
	"reference_id" varchar(64),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reservation_id" uuid,
	"run_id" uuid,
	"step_id" uuid,
	"model_key" varchar(64) NOT NULL,
	"input_tokens" smallint DEFAULT 0 NOT NULL,
	"output_tokens" smallint DEFAULT 0 NOT NULL,
	"cost_amount" numeric(20, 8) NOT NULL,
	"credits_charged" numeric(20, 8) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_key" varchar(64) NOT NULL,
	"input_cost_per_1k" numeric(20, 8) NOT NULL,
	"output_cost_per_1k" numeric(20, 8) NOT NULL,
	"markup_percent" numeric(6, 3) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_to" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" text NOT NULL,
	"monthly_credits" numeric(20, 8) NOT NULL,
	"price_per_month_cents" integer NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL,
	"stripe_price_id" text,
	"iyzico_plan_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"external_subscription_id" text,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"exchange" varchar(16),
	"name" text NOT NULL,
	"asset_type" "asset_type" NOT NULL,
	"currency" varchar(8) DEFAULT 'TRY' NOT NULL,
	"isin" varchar(32),
	"sector" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_assets_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "market_candles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"interval" "candle_interval" NOT NULL,
	"open_time" timestamp with time zone NOT NULL,
	"close_time" timestamp with time zone NOT NULL,
	"open" numeric(20, 8) NOT NULL,
	"high" numeric(20, 8) NOT NULL,
	"low" numeric(20, 8) NOT NULL,
	"close" numeric(20, 8) NOT NULL,
	"volume" numeric(20, 4),
	"provider" "market_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" varchar(8) NOT NULL,
	"quote_currency" varchar(8) NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"provider" "market_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"currency" varchar(8) NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"provider" "market_provider" NOT NULL,
	"delayed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_financial_ratios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"ratios" jsonb NOT NULL,
	"provider" "market_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_financial_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"statement_type" "statement_type" NOT NULL,
	"period" varchar(16) NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"fiscal_year" integer NOT NULL,
	"currency" varchar(8) NOT NULL,
	"raw_data" jsonb NOT NULL,
	"provider" "market_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_technical_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"indicator_type" "technical_indicator_type" NOT NULL,
	"interval" "candle_interval" NOT NULL,
	"as_of" timestamp with time zone NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"value" numeric(20, 8),
	"series" jsonb,
	"provider" "market_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_symbol" varchar(32),
	"title" text NOT NULL,
	"summary" text,
	"url" text NOT NULL,
	"source" varchar(64) NOT NULL,
	"language" varchar(8) DEFAULT 'en' NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"provider" "market_provider" NOT NULL,
	"sentiment" numeric(4, 3),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"avg_cost" numeric(20, 8) NOT NULL,
	"realized_pnl" numeric(20, 8) DEFAULT '0' NOT NULL,
	"last_computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"asset_symbol" varchar(32) NOT NULL,
	"side" "transaction_side" NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"unit_price" numeric(20, 8) NOT NULL,
	"fees" numeric(20, 8) DEFAULT '0' NOT NULL,
	"currency" varchar(8) NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"base_currency" varchar(8) DEFAULT 'TRY' NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_channel_kind" NOT NULL,
	"external_id" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"kind" "notification_kind" NOT NULL,
	"priority" "notification_priority" DEFAULT 'normal' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"payload" jsonb,
	"related_run_id" uuid,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid NOT NULL,
	"agent_run_id" uuid,
	"status" "report_status" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"portfolio_id" uuid,
	"title" text NOT NULL,
	"report_type" "report_type" NOT NULL,
	"format" "report_format" NOT NULL,
	"status" "report_status" NOT NULL,
	"storage_key" text,
	"parameters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"generated_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"name" varchar(64) NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_graph_snapshots" ADD CONSTRAINT "agent_graph_snapshots_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_run_steps" ADD CONSTRAINT "ai_agent_run_steps_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_runs" ADD CONSTRAINT "ai_agent_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tool_calls" ADD CONSTRAINT "ai_tool_calls_step_id_ai_agent_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_run_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_step_id_ai_agent_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_run_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_job_executions" ADD CONSTRAINT "scheduled_job_executions_job_id_user_scheduled_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."user_scheduled_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_job_executions" ADD CONSTRAINT "scheduled_job_executions_agent_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_scheduled_jobs" ADD CONSTRAINT "user_scheduled_jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_reservations" ADD CONSTRAINT "billing_credit_reservations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_reservations" ADD CONSTRAINT "billing_credit_reservations_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_transactions" ADD CONSTRAINT "billing_credit_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_transactions" ADD CONSTRAINT "billing_credit_transactions_reservation_id_billing_credit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."billing_credit_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_transactions" ADD CONSTRAINT "billing_credit_transactions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_reservation_id_billing_credit_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."billing_credit_reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_usage_events" ADD CONSTRAINT "billing_usage_events_step_id_ai_agent_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."ai_agent_run_steps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_candles" ADD CONSTRAINT "market_candles_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_prices" ADD CONSTRAINT "market_prices_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_financial_ratios" ADD CONSTRAINT "market_financial_ratios_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_financial_statements" ADD CONSTRAINT "market_financial_statements_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_technical_indicators" ADD CONSTRAINT "market_technical_indicators_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_news" ADD CONSTRAINT "market_news_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_holdings" ADD CONSTRAINT "portfolio_holdings_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_asset_symbol_market_assets_symbol_fk" FOREIGN KEY ("asset_symbol") REFERENCES "public"."market_assets"("symbol") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_channels" ADD CONSTRAINT "notification_channels_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("related_run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_jobs" ADD CONSTRAINT "report_jobs_agent_run_id_ai_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."ai_agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_secrets" ADD CONSTRAINT "integration_secrets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_graph_snapshots_run_checkpoint_uniq" ON "agent_graph_snapshots" USING btree ("run_id","checkpoint_id");--> statement-breakpoint
CREATE INDEX "agent_graph_snapshots_run_created_idx" ON "agent_graph_snapshots" USING btree ("run_id","created_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "ai_agent_run_steps_run_node_attempt_uniq" ON "ai_agent_run_steps" USING btree ("run_id","node_key","attempt");--> statement-breakpoint
CREATE INDEX "ai_agent_run_steps_run_status_idx" ON "ai_agent_run_steps" USING btree ("run_id","status");--> statement-breakpoint
CREATE INDEX "ai_agent_runs_user_status_idx" ON "ai_agent_runs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "ai_agent_runs_thread_idx" ON "ai_agent_runs" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "ai_agent_runs_graph_status_idx" ON "ai_agent_runs" USING btree ("graph_key","status");--> statement-breakpoint
CREATE INDEX "ai_tool_calls_step_invoked_idx" ON "ai_tool_calls" USING btree ("step_id","invoked_at");--> statement-breakpoint
CREATE INDEX "ai_usage_events_run_idx" ON "ai_usage_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "ai_usage_events_user_occurred_idx" ON "ai_usage_events" USING btree ("user_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "chat_messages_session_created_idx" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_updated_idx" ON "chat_sessions" USING btree ("user_id","updated_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique_idx" ON "account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique_idx" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique_idx" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_banned_idx" ON "user" USING btree ("banned");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "job_queue_items_queue_status_run_at_idx" ON "job_queue_items" USING btree ("queue_name","status","run_at");--> statement-breakpoint
CREATE INDEX "job_queue_items_locked_idx" ON "job_queue_items" USING btree ("locked_until");--> statement-breakpoint
CREATE INDEX "scheduled_job_executions_job_started_idx" ON "scheduled_job_executions" USING btree ("job_id","started_at" DESC);--> statement-breakpoint
CREATE INDEX "user_scheduled_jobs_user_status_idx" ON "user_scheduled_jobs" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_scheduled_jobs_due_idx" ON "user_scheduled_jobs" USING btree ("status","next_run_at");--> statement-breakpoint
CREATE INDEX "billing_credit_reservations_user_status_idx" ON "billing_credit_reservations" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "billing_credit_reservations_run_idx" ON "billing_credit_reservations" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "billing_credit_reservations_expires_idx" ON "billing_credit_reservations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "billing_credit_transactions_user_created_idx" ON "billing_credit_transactions" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "billing_credit_transactions_reservation_idx" ON "billing_credit_transactions" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "billing_usage_events_user_occurred_idx" ON "billing_usage_events" USING btree ("user_id","occurred_at" DESC);--> statement-breakpoint
CREATE INDEX "billing_usage_events_reservation_idx" ON "billing_usage_events" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "billing_usage_events_run_idx" ON "billing_usage_events" USING btree ("run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_pricing_key_uniq" ON "model_pricing" USING btree ("model_key");--> statement-breakpoint
CREATE INDEX "model_pricing_effective_idx" ON "model_pricing" USING btree ("model_key","effective_from" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "plans_code_uniq" ON "plans" USING btree ("code");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_provider_external_uniq" ON "subscriptions" USING btree ("provider","external_subscription_id");--> statement-breakpoint
CREATE INDEX "market_assets_exchange_idx" ON "market_assets" USING btree ("exchange");--> statement-breakpoint
CREATE INDEX "market_assets_type_idx" ON "market_assets" USING btree ("asset_type");--> statement-breakpoint
CREATE UNIQUE INDEX "market_candles_symbol_interval_open_provider_uniq" ON "market_candles" USING btree ("asset_symbol","interval","open_time","provider");--> statement-breakpoint
CREATE INDEX "market_candles_lookup_idx" ON "market_candles" USING btree ("asset_symbol","interval","open_time" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_fx_rates_base_quote_asof_provider_uniq" ON "market_fx_rates" USING btree ("base_currency","quote_currency","as_of","provider");--> statement-breakpoint
CREATE INDEX "market_fx_rates_lookup_idx" ON "market_fx_rates" USING btree ("base_currency","quote_currency","as_of" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_prices_symbol_provider_asof_uniq" ON "market_prices" USING btree ("asset_symbol","provider","as_of");--> statement-breakpoint
CREATE INDEX "market_prices_symbol_asof_idx" ON "market_prices" USING btree ("asset_symbol","as_of" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_financial_ratios_symbol_period_provider_uniq" ON "market_financial_ratios" USING btree ("asset_symbol","period_end","provider");--> statement-breakpoint
CREATE INDEX "market_financial_ratios_lookup_idx" ON "market_financial_ratios" USING btree ("asset_symbol","period_end" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_financial_statements_symbol_type_period_provider_uniq" ON "market_financial_statements" USING btree ("asset_symbol","statement_type","period","provider");--> statement-breakpoint
CREATE INDEX "market_financial_statements_lookup_idx" ON "market_financial_statements" USING btree ("asset_symbol","statement_type","period_end" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_technical_indicators_symbol_type_interval_asof_params_uniq" ON "market_technical_indicators" USING btree ("asset_symbol","indicator_type","interval","as_of","params");--> statement-breakpoint
CREATE INDEX "market_technical_indicators_lookup_idx" ON "market_technical_indicators" USING btree ("asset_symbol","indicator_type","as_of" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "market_news_url_uniq" ON "market_news" USING btree ("url");--> statement-breakpoint
CREATE INDEX "market_news_symbol_published_idx" ON "market_news" USING btree ("asset_symbol","published_at" DESC);--> statement-breakpoint
CREATE INDEX "market_news_published_idx" ON "market_news" USING btree ("published_at" DESC);--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_holdings_portfolio_asset_uniq" ON "portfolio_holdings" USING btree ("portfolio_id","asset_symbol");--> statement-breakpoint
CREATE INDEX "portfolio_holdings_portfolio_idx" ON "portfolio_holdings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "portfolio_transactions_portfolio_executed_idx" ON "portfolio_transactions" USING btree ("portfolio_id","executed_at" DESC);--> statement-breakpoint
CREATE INDEX "portfolio_transactions_asset_idx" ON "portfolio_transactions" USING btree ("asset_symbol");--> statement-breakpoint
CREATE INDEX "portfolios_user_idx" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_channels_user_kind_external_uniq" ON "notification_channels" USING btree ("user_id","kind","external_id");--> statement-breakpoint
CREATE INDEX "notification_channels_user_kind_idx" ON "notification_channels" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "report_jobs_report_idx" ON "report_jobs" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_jobs_status_idx" ON "report_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_user_created_idx" ON "reports" USING btree ("user_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_secrets_user_provider_name_uniq" ON "integration_secrets" USING btree ("user_id","provider","name");--> statement-breakpoint
CREATE INDEX "integration_secrets_user_provider_idx" ON "integration_secrets" USING btree ("user_id","provider");