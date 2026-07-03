/**
 * @openbulls/config — environment variable access.
 *
 * Two flavors:
 *   - `serverEnv()` — privileged, only callable from server code
 *   - `publicEnv()` — safe to expose to client (NEXT_PUBLIC_*)
 *
 * Throws on missing required variables so misconfiguration is caught at
 * boot, not at runtime.
 */

type NodeEnv = 'development' | 'test' | 'production';

const NODE_ENV = (process.env.NODE_ENV ?? 'development') as NodeEnv;

interface ServerEnv {
  NODE_ENV: NodeEnv;
  DATABASE_URL: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  LOG_LEVEL: string;
  REDIS_URL: string | undefined;
  STRIPE_SECRET_KEY: string | undefined;
  STRIPE_WEBHOOK_SECRET: string | undefined;
  IYZICO_API_KEY: string | undefined;
  IYZICO_SECRET_KEY: string | undefined;
  AI_GATEWAY_API_KEY: string | undefined;
  ANTHROPIC_API_KEY: string | undefined;
  OPENAI_API_KEY: string | undefined;
  GOOGLE_GENERATIVE_AI_API_KEY: string | undefined;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  TELEGRAM_WEBHOOK_URL: string | undefined;
  TELEGRAM_WEBHOOK_SECRET: string | undefined;
  TELEGRAM_LINK_TOKEN_TTL_SEC: number;
  TWELVE_DATA_API_KEY: string | undefined;
  YAHOO_FINANCE_API_KEY: string | undefined;
  KAP_API_KEY: string | undefined;
  TCMB_API_KEY: string | undefined;
  SENTRY_DSN: string | undefined;
  OTEL_EXPORTER_OTLP_ENDPOINT: string | undefined;
  // Agent worker (Faz 3)
  WORKER_QUEUE_NAME: string;
  WORKER_CONCURRENCY: number;
  WORKER_RATE_LIMIT_PER_MIN: number;
  WORKER_HEARTBEAT_INTERVAL_MS: number;
  AGENT_GRAPH_DEFAULT_MODEL: string;
  AGENT_GRAPH_MAX_RETRIES: number;
  AGENT_GRAPH_CHECKPOINT_EVERY_N_STEPS: number;
  AGENT_JOB_TIMEOUT_MS: number;
  // Cron dispatcher (Faz 5)
  CRON_QUEUE_NAME: string;
  CRON_TICK_INTERVAL_MS: number;
  CRON_BATCH_SIZE: number;
}

interface PublicEnv {
  NEXT_PUBLIC_APP_URL: string;
}

let cachedServer: ServerEnv | null = null;
let cachedPublic: PublicEnv | null = null;

/**
 * Memoized server env reader. Throws if a required key is missing.
 * Use from server-only code (route handlers, server actions, workers).
 */
export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value || value.length === 0) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return value;
  };
  const optionalNumber = (key: string, fallback: number): number => {
    const raw = process.env[key];
    if (!raw || raw.length === 0) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric env var ${key}=${raw}`);
    }
    return parsed;
  };
  const env: ServerEnv = {
    NODE_ENV,
    DATABASE_URL: required('DATABASE_URL'),
    BETTER_AUTH_SECRET: required('BETTER_AUTH_SECRET'),
    BETTER_AUTH_URL: required('BETTER_AUTH_URL'),
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
    REDIS_URL: process.env.REDIS_URL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    IYZICO_API_KEY: process.env.IYZICO_API_KEY,
    IYZICO_SECRET_KEY: process.env.IYZICO_SECRET_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    TELEGRAM_BOT_TOKEN: required('TELEGRAM_BOT_TOKEN'),
    TELEGRAM_BOT_USERNAME: required('TELEGRAM_BOT_USERNAME'),
    TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
    TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    TELEGRAM_LINK_TOKEN_TTL_SEC: optionalNumber(
      'TELEGRAM_LINK_TOKEN_TTL_SEC',
      300,
    ),
    TWELVE_DATA_API_KEY: process.env.TWELVE_DATA_API_KEY,
    YAHOO_FINANCE_API_KEY: process.env.YAHOO_FINANCE_API_KEY,
    KAP_API_KEY: process.env.KAP_API_KEY,
    TCMB_API_KEY: process.env.TCMB_API_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    OTEL_EXPORTER_OTLP_ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    // Agent worker (Faz 3) — sane defaults so worker boots in dev without setup.
    WORKER_QUEUE_NAME: process.env.WORKER_QUEUE_NAME ?? 'agent-runs',
    WORKER_CONCURRENCY: optionalNumber('WORKER_CONCURRENCY', 4),
    WORKER_RATE_LIMIT_PER_MIN: optionalNumber('WORKER_RATE_LIMIT_PER_MIN', 120),
    WORKER_HEARTBEAT_INTERVAL_MS: optionalNumber(
      'WORKER_HEARTBEAT_INTERVAL_MS',
      30_000,
    ),
    AGENT_GRAPH_DEFAULT_MODEL:
      process.env.AGENT_GRAPH_DEFAULT_MODEL ?? 'claude-fable-5',
    AGENT_GRAPH_MAX_RETRIES: optionalNumber('AGENT_GRAPH_MAX_RETRIES', 3),
    AGENT_GRAPH_CHECKPOINT_EVERY_N_STEPS: optionalNumber(
      'AGENT_GRAPH_CHECKPOINT_EVERY_N_STEPS',
      1,
    ),
    AGENT_JOB_TIMEOUT_MS: optionalNumber('AGENT_JOB_TIMEOUT_MS', 3_600_000),
    // Cron dispatcher (Faz 5) — sane defaults so the cron app boots
    // without explicit configuration in dev.
    CRON_QUEUE_NAME: process.env.CRON_QUEUE_NAME ?? 'automation-dispatch',
    CRON_TICK_INTERVAL_MS: optionalNumber('CRON_TICK_INTERVAL_MS', 60_000),
    CRON_BATCH_SIZE: optionalNumber('CRON_BATCH_SIZE', 50),
  };
  cachedServer = env;
  return env;
}

/**
 * Memoized public env reader. Safe for client bundles.
 */
export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  cachedPublic = {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
  return cachedPublic;
}

/**
 * Reset memoized env (for tests only).
 */
export function resetEnvCache(): void {
  cachedServer = null;
  cachedPublic = null;
}

export type { NodeEnv, PublicEnv, ServerEnv };
